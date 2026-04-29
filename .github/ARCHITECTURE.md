# Two Spies — System Architecture

---

## Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (Client)                         │
│                   stitch-frontend/                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   main.tsx (React App)                                       │
│   ├─ Phase 1: CodenameAuthorizationTerminal (login)          │
│   ├─ Phase 2: MissionDeploymentHub (lobby)                   │
│   └─ Phase 3: PhaserGame (active game)                       │
│       ├─ SVG Map (city nodes + edges + markers)              │
│       ├─ Game Panel (stats, Intel log, opponent info)        │
│       └─ Action Bar (MOVE/STRIKE/ABILITY/WAIT/CONTROL)       │
│                                                              │
│   WebSocketClient (EventEmitter)                             │
│   ├─ connect(url)                                            │
│   ├─ send(type, payload)                                     │
│   └─ on(event, listener)                                     │
│                                                              │
└───────────────────┬──────────────────────────────────────────┘
                    │  JSON over WebSocket
                    │  ws://localhost:8085 (dev)
                    │  wss://spies.atyourservice-ai.com (prod)
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                  C++ Server (backend/)                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   WebSocketServer (Boost.Beast + Boost.Asio)                 │
│   ├─ TCP acceptor on port 8085                               │
│   ├─ HTTP → WebSocket upgrade                                │
│   └─ Creates Session per connection                          │
│                                                              │
│   Session (N per server)                                     │
│   ├─ Unique player_id (UUID)                                 │
│   ├─ Reads/writes WebSocket frames                           │
│   └─ Dispatches messages to MatchManager or Match            │
│                                                              │
│   MatchManager (singleton)                                   │
│   ├─ create_match(session_id) → 4-digit code                 │
│   ├─ join_match_by_code(code, session_id)                    │
│   └─ get_match(session_id)                                   │
│                                                              │
│   Match (one per active game)                                │
│   ├─ red_player_id / blue_player_id                          │
│   ├─ GameState (pure logic)                                  │
│   ├─ Turn timer (30s)                                        │
│   └─ send_fn callbacks (routes messages to both players)     │
│                                                              │
│   GameState (pure, no I/O)                                   │
│   ├─ move(side, city)                                        │
│   ├─ strike(side, city)                                      │
│   ├─ use_ability(side, ability, city?)                       │
│   ├─ wait(side)                                              │
│   ├─ control(side)                                           │
│   └─ end_turn(side)                                          │
│                                                              │
│   CityGraph                                                  │
│   ├─ are_adjacent(from, to) → bool                           │
│   └─ adjacent(city_id) → vector<string>                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Layer Responsibilities

| Layer | File(s) | Responsibility | What It Must NOT Do |
|---|---|---|---|
| `GameState` | `GameState.hpp/.cpp` | Pure game rules and state transitions | I/O, networking, timers |
| `Match` | `Match.hpp/.cpp` | Bind two players to GameState, route actions, broadcast state | Contain game rules |
| `MatchManager` | `MatchManager.hpp/.cpp` | Lobby: create/join matches, manage room codes | Game rules or networking |
| `Session` | `Session.hpp/.cpp` | Per-connection I/O, WebSocket frame read/write | Game rules |
| `WebSocketServer` | `WebSocketServer.hpp/.cpp` | TCP accept loop, WebSocket upgrade, dispatch | Game logic |
| `PhaserGame` | `PhaserGame.tsx` | Render game state, handle user input, send actions | Compute game outcomes |
| `WebSocketClient` | `WebSocketClient.ts` | Connect/disconnect, send/receive JSON, emit events | Any game logic |
| `Messages.ts` | `types/Messages.ts` | Type definitions for all messages and state | Logic |

**Critical rule**: No cross-layer leakage. Game logic never depends on network code. UI never computes outcomes.

---

## Message Flow: Full Game Lifecycle

### 1. Connection
```
Client                        Server
  |                              |
  |──── WebSocket connect ──────►|
  |                              | Create Session (unique player_id)
  |◄─── (connection open) ───────|
```

### 2. Name Registration
```
Client                        Server
  |                              |
  |── SET_PLAYER_NAME {name} ───►|
  |                              | Session stores player name
```

### 3. Match Creation (Host)
```
Client (Host)                 Server
  |                              |
  |──── CREATE_MATCH ───────────►|
  |                              | MatchManager generates 4-digit code
  |◄── MATCH_CREATED {code} ─────|
  |◄── WAITING_FOR_OPPONENT ─────|
```

### 4. Match Joining (Guest)
```
Client (Guest)                Server
  |                              |
  |── JOIN_MATCH {code} ────────►|
  |                              | Match found; add guest to match
  |◄── MATCH_CREATED {code} ─────|  (confirms join)
  |                              |
[Both clients now connected to same Match]
  |                              |
  |◄── MATCH_START {side, map} ──| (broadcast to both)
  |◄── MATCH_STATE {state} ──────| (initial filtered state)
```

### 5. Gameplay Turn
```
Active Player                 Server                  Waiting Player
  |                              |                          |
  |── PLAYER_ACTION {action} ───►|                          |
  |                              | GameState.action()       |
  |                              | validate + apply         |
  |◄── MATCH_STATE (filtered) ───|──── MATCH_STATE ────────►|
  |                              |                          |
  [2 actions used or END_TURN]
  |                              |
  |── END_TURN ─────────────────►|
  |                              | award Intel, switch turn
  |◄── MATCH_STATE (filtered) ───|──── MATCH_STATE ────────►|
  |◄── TURN_CHANGE ──────────────|──── TURN_CHANGE ─────────►|
```

### 6. Game Over
```
Client                        Server
  |                              |
  |◄── GAME_OVER {winner, reason}| (broadcast to both)
  |                              |
  |── LEAVE_MATCH ──────────────►|  (optional cleanup)
```

---

## Fog of War (Filtered State)

The server sends **different state payloads** to each player. The function `serialize_match_state(state, for_player)` in `Messages.cpp` is the single point of filtering:

| Field | What each player receives |
|---|---|
| `player.currentCity` | Always own city |
| `player.knownOpponentCity` | Only if revealed (Locate ability or Strike Report triggered) |
| `player.intel` | Own Intel count only |
| `player.abilities` | Own ability list only |
| `disappearedCities` | Same for both (global event) |
| `controlledCities` | All controlled cities (both sides visible) |
| `scheduledDisappearCity` | Same for both (map pressure warning) |
| `intelPopups` | Only for popups the receiving player should see |

**Consequence**: Never compute opponent state client-side. Always wait for a `MATCH_STATE` from the server.

---

## Turn Timer

- **Server**: `Match::TURN_DURATION_MS = 30000` (30 seconds)
- **Server sends**: `timeElapsedMs` in every `MATCH_STATE`
- **Client**: Locally counts up from `timeElapsedMs` using `setInterval`
- **Display**: `Math.ceil((turnDuration - localTimerMs) / 1000)` seconds
- **Visual**: Timer turns red and pulses when ≤ 5 seconds remain
- **Timeout**: Server auto-calls `end_turn(side, skip_exploration_bonus=true)` on timeout

---

## Shrinking Map Mechanic

The server cycles through cities on a counter:
- **Action #4 of cycle**: Server schedules one city to disappear (`scheduledDisappearCity` in state)
- **Action #6 of cycle**: Scheduled city disappears; added to `disappearedCities`
- **Stranded**: If a player is in the scheduled city when it disappears, they can only `MOVE` until they leave
- **Win condition**: If stranded player cannot move (no adjacent non-disappeared cities), opponent wins

---

## WebSocket URL Resolution

```typescript
// WebSocketClient.ts
// Supports both absolute and relative URLs:
// - "ws://localhost:8085"  → dev mode
// - "/ws"                  → auto-upgrades to current host + wss://
```

In production, Traefik terminates TLS and proxies to the backend container on port 8085.

---

## Threading Model (Backend)

- **Boost.Asio** runs an `io_context` with N threads (configured at startup, default 4)
- **Sessions**: Each connection has its own async read/write chains; no blocking
- **MatchManager**: Protected by `mutable std::mutex matches_mutex_`
- **Match**: Protected by `mutable std::mutex mutex_`
- **Session write queue**: Protected by `write_mutex_` using strand pattern (no write interleaving)
- **GameState**: Accessed exclusively through `Match::handle_action()` while holding match mutex — effectively single-threaded per match

---

## State Machine (Per Player, Per Turn)

```
        [Turn Starts]
             │
             ▼
     actions_remaining = 2
             │
       ┌─────┴─────┐
       │  Can Act? │ ← (hasCover, isStranded, actionsRemaining > 0)
       └─────┬─────┘
             │ YES
      ┌──────▼──────────────────────────────────┐
      │  Actions Available:                      │
      │  • MOVE (adjacent city)                  │
      │  • STRIKE (any city)                     │
      │  • ABILITY (LOCATE / DEEP_COVER /        │
      │             STRIKE_REPORT)               │
      │  • WAIT (stay, gain cover)               │
      │  • CONTROL (claim current city)          │
      └──────┬──────────────────────────────────┘
             │
             ▼
      actions_remaining -= 1
             │
      ┌──────▼──────────┐
      │ actions_remaining│
      │  == 0 ?          │
      └──────┬───────────┘
             │ YES → auto end_turn()
             │ NO  → await next action or manual END_TURN
             ▼
       [Turn Ends]
       • Award base Intel (+4)
       • Award exploration bonus (+4, if new city visited this turn)
       • Clear per-turn flags
       • Switch currentTurn
```
