# Backend ↔ stitch-frontend Protocol Quick Reference

**For rapid lookup during Stitch stitch-frontend integration.**

---

## Message Flow Chart

```
stitch-frontend                          BACKEND
   |                                |
   |---- CREATE_MATCH -----------→  |
   |                                | Create Match, assign code
   |← ---- MATCH_CREATED -----      |
   |                                |
   |---- JOIN_MATCH ---(code)-----→ |
   |                                | Validate code, add player
   |← ---- WAITING_FOR_OPPONENT    |
   |                                | (repeat for other player)
   |                                | Both players present? Start!
   |← ---- MATCH_START -----------  |
   |← ---- MATCH_STATE (initial) -- |
   |                                |
   |---- SET_PLAYER_NAME --------→  |
   |                                | Store display name
   |                                |
   | ═════ GAME LOOP ═════          |
   |                                |
   |---- PLAYER_ACTION -----------→ |
   |  (MOVE|STRIKE|ABILITY|         | Validate, apply mutation,
   |   CONTROL|WAIT)                 | update game state
   |← ---- MATCH_STATE (updated) -- |
   |                                |
   | [Repeat PLAYER_ACTION]         |
   |                                |
   |---- END_TURN ---------------→  |
   |                                | Clear actions, pass turn
   |← ---- TURN_CHANGE ------------ |
   |← ---- MATCH_STATE (next turn) -|
   |                                |
   | [Repeat for next player]       |
   |                                |
   | [Continue until strike or     |
   |  disconnect]                   |
   |                                |
   |← ---- GAME_OVER -------------- |
   |  (winner = RED|BLUE)            |
   |
   [Connection closes]
```

---

## Messages (A-Z)

### CREATE_MATCH

| Aspect | Value |
|--------|-------|
| **Flow** | Client → Server |
| **Payload** | `{}` (empty) |
| **Response** | `MATCH_CREATED` |
| **Handler** | `MatchManager::create_match()` |
| **stitch-frontend** | LobbyScene: "Create Match" button |
| **Backend** | `backend/src/game/MatchManager.cpp` |

**JSON:**
```json
{"type":"CREATE_MATCH","payload":{}}
```

---

### MATCH_CREATED

| Aspect | Value |
|--------|-------|
| **Flow** | Server → Client |
| **Triggered By** | `CREATE_MATCH` |
| **Payload** | `{code, sessionId}` |
| **Handler** | stitch-frontend: Store code, show to user |
| **Backend** | `backend/src/protocol/Messages.cpp` → `make_server_message()` |

**JSON:**
```json
{
  "type":"MATCH_CREATED",
  "sessionId":"...",
  "payload":{"code":"ABC123","sessionId":"..."}
}
```

---

### JOIN_MATCH

| Aspect | Value |
|--------|-------|
| **Flow** | Client → Server |
| **Payload** | `{code}` |
| **Response** | `WAITING_FOR_OPPONENT` or `ERROR` |
| **Handler** | `MatchManager::join_match(code)` |
| **stitch-frontend** | LobbyScene: Enter code field + Join button |
| **Backend** | `backend/src/game/MatchManager.cpp` |

**JSON:**
```json
{"type":"JOIN_MATCH","payload":{"code":"ABC123"}}
```

---

### WAITING_FOR_OPPONENT

| Aspect | Value |
|--------|-------|
| **Flow** | Server → Client |
| **Triggered By** | `JOIN_MATCH` (successful) |
| **Payload** | `{}` |
| **Handler** | stitch-frontend: Show waiting state |

**JSON:**
```json
{"type":"WAITING_FOR_OPPONENT","sessionId":"...","payload":{}}
```

---

### MATCH_START

| Aspect | Value |
|--------|-------|
| **Flow** | Server → Client (broadcast both) |
| **Triggered By** | Second player joins |
| **Payload** | `{sessionId, player: {side, startingCity, opponentStartingCity}}` |
| **Handler** | stitch-frontend: Transition to GameScene, init board |
| **Backend** | `Match::start()` → `serialize_match_state()` |

**JSON:**
```json
{
  "type":"MATCH_START",
  "sessionId":"...",
  "payload":{
    "sessionId":"...",
    "player":{
      "side":"RED",
      "startingCity":"prague",
      "opponentStartingCity":"moscow"
    }
  }
}
```

---

### SET_PLAYER_NAME

| Aspect | Value |
|--------|-------|
| **Flow** | Client → Server |
| **Payload** | `{name}` |
| **Response** | None (async) |
| **Handler** | `Session::set_player_name()` |
| **stitch-frontend** | LobbyScene: Name input + Set button |
| **Backend** | `backend/src/network/Session.cpp` |

**JSON:**
```json
{"type":"SET_PLAYER_NAME","payload":{"name":"Agent Shadow"}}
```

---

### PLAYER_ACTION

| Aspect | Value |
|--------|-------|
| **Flow** | Client → Server |
| **Actions** | `MOVE`, `STRIKE`, `ABILITY`, `CONTROL`, `WAIT` |
| **Response** | `MATCH_STATE` (if valid) or `ERROR` |
| **Handler** | `Match::handle_action()` |
| **stitch-frontend** | GameScene: Action buttons + board clicks |
| **Backend** | `backend/src/game/GameState.cpp::use_action()` |

#### MOVE
```json
{"type":"PLAYER_ACTION","payload":{"action":"MOVE","targetCity":"berlin"}}
```

#### STRIKE
```json
{"type":"PLAYER_ACTION","payload":{"action":"STRIKE","targetCity":"moscow"}}
```

#### ABILITY (DEEP_COVER)
```json
{"type":"PLAYER_ACTION","payload":{"action":"ABILITY","abilityId":"DEEP_COVER"}}
```

#### ABILITY (LOCATE)
```json
{"type":"PLAYER_ACTION","payload":{"action":"ABILITY","abilityId":"LOCATE"}}
```

#### CONTROL
```json
{"type":"PLAYER_ACTION","payload":{"action":"CONTROL"}}
```

#### WAIT
```json
{"type":"PLAYER_ACTION","payload":{"action":"WAIT"}}
```

---

### MATCH_STATE

| Aspect | Value |
|--------|-------|
| **Flow** | Server → Client |
| **Frequency** | After action, after END_TURN, periodically for timer |
| **Payload** | Full game state (see below) |
| **Handler** | stitch-frontend: Update board, HUD, display notifications |
| **Backend** | `serialize_match_state()` in `backend/src/protocol/Messages.cpp` |

**Key Fields:**
```json
{
  "type":"MATCH_STATE",
  "sessionId":"...",
  "payload":{
    "turnNumber":1,
    "currentTurn":"RED",
    "player":{
      "side":"RED",
      "name":"Agent Shadow",
      "currentCity":"prague",
      "intel":0,
      "actionsRemaining":2,
      "hasCover":false,
      "abilities":["DEEP_COVER","LOCATE","STRIKE_REPORT"],
      "knownOpponentCity":null,
      "opponentUsedStrike":false,
      "opponentUsedLocate":false,
      "opponentUsedDeepCover":false,
      "locateBlockedByDeepCover":false,
      "startingCity":"prague",
      "opponentStartingCity":"moscow",
      "claimedIntel":false
    },
    "opponentName":"Agent Phantom",
    "gameOver":false,
    "winner":null,
    "controlledCities":{"prague":"RED","moscow":"BLUE"},
    "intelPopups":[{"city":"berlin","amount":10}],
    "timeElapsedMs":1234
    // ... (full structure in main doc)
  }
}
```

---

### END_TURN

| Aspect | Value |
|--------|-------|
| **Flow** | Client → Server |
| **Payload** | `{}` |
| **Response** | `TURN_CHANGE` + `MATCH_STATE` |
| **Handler** | `Match::handle_end_turn()` |
| **stitch-frontend** | GameScene: "End Turn" button |
| **Backend** | `backend/src/game/Match.cpp` |

**JSON:**
```json
{"type":"END_TURN","payload":{}}
```

---

### TURN_CHANGE

| Aspect | Value |
|--------|-------|
| **Flow** | Server → Client (broadcast) |
| **Triggered By** | `END_TURN` or timeout |
| **Payload** | `{turnNumber, currentTurn}` |
| **Handler** | stitch-frontend: Show whose turn it is |
| **Backend** | `Match::handle_end_turn()` |

**JSON:**
```json
{
  "type":"TURN_CHANGE",
  "sessionId":"...",
  "payload":{"turnNumber":2,"currentTurn":"BLUE"}
}
```

---

### GAME_OVER

| Aspect | Value |
|--------|-------|
| **Flow** | Server → Client (broadcast) |
| **Triggered By** | Strike succeeds, opponent disconnects |
| **Payload** | `{winner, reason}` |
| **Handler** | stitch-frontend: Show victory/defeat, disable buttons |
| **Backend** | `GameState::check_strike_result()` |

**JSON:**
```json
{
  "type":"GAME_OVER",
  "sessionId":"...",
  "payload":{"winner":"RED","reason":"STRIKE_SUCCESS"}
}
```

---

### ERROR

| Aspect | Value |
|--------|-------|
| **Flow** | Server → Client |
| **Triggered By** | Validation failure, malformed message, etc. |
| **Payload** | `{message}` |
| **Handler** | stitch-frontend: Log, optionally show toast notification |
| **Backend** | `MatchManager`, `Match`, `GameState` |

**JSON:**
```json
{
  "type":"ERROR",
  "sessionId":"...",
  "payload":{"message":"Invalid city: city not adjacent"}
}
```

---

## Action Type → Validation Rules

| Action | Required Fields | Validation | Cost |
|--------|---|---|---|
| **MOVE** | `targetCity` | Adjacent, exists, not disappeared | 1 action |
| **STRIKE** | `targetCity` | Exists, visible to opponent | 1 action |
| **ABILITY** | `abilityId`, optional `targetCity` | Ability known, valid for ability | 1 action |
| **CONTROL** | — | Current city has Intel available | 1 action |
| **WAIT** | — | Always valid | 1 action |

---

## Ability Quick Reference

| Ability | Cost | Effect | Notes |
|---------|------|--------|-------|
| **DEEP_COVER** | 1 | Hide for 2 turns, block LOCATE | Blocks opponent's LOCATE attempts |
| **LOCATE** | 1 | See opponent city | Blocked by opponent's DEEP_COVER; if blocked, reveal striker position |
| **ENCRYPTION** | 1 | Protect accumulated Intel | *Under development* |
| **STRIKE_REPORT** | 1 | Reveal opponent's last-known location | *Under development* |
| **RAPID_RECON** | 1 | Move 2 cities (auto end turn) | *Under development* |
| **PREP_MISSION** | 1 | TBD | *Under development* |

---

## Player State Flags (Feedback)

After each `MATCH_STATE`, check these flags to trigger stitch-frontend notifications:

| Flag | Sets When | stitch-frontend Action |
|------|-----------|-----------------|
| `opponentUsedStrike` | Opponent tried STRIKE | Show "Opponent attempted strike!" banner |
| `opponentUsedLocate` | Opponent used LOCATE | Show "Opponent used Locate" banner |
| `opponentUsedDeepCover` | Opponent used DEEP_COVER | Show "Opponent activated Deep Cover" banner |
| `locateBlockedByDeepCover` | LOCATE blocked by Deep Cover + attacker position revealed | Show "Locate blocked! Your position revealed!" banner |
| `claimedIntel` | Player claimed Intel at starting city | Show "Intel claimed!" banner |
| `knownOpponentCity` | Set during LOCATE or failed STRIKE | Update opponent marker on board |

---

## Serialization Map (Backend → stitch-frontend)

| Backend (C++) | stitch-frontend (TypeScript) | Type | Notes |
|---|---|---|---|
| `Player::side` | `PlayerState.side` | `'RED'` \| `'BLUE'` | Enum string |
| `Player::name` | `PlayerState.name` | string | Display name |
| `Player::current_city` | `PlayerState.currentCity` | string | City ID |
| `Player::intel` | `PlayerState.intel` | number | 0-300+ |
| `Player::actions_remaining` | `PlayerState.actionsRemaining` | number | Usually 0-2 |
| `Player::has_cover` | `PlayerState.hasCover` | boolean | *Deprecated, use abilities* |
| `Player::abilities` | `PlayerState.abilities` | string[] | Enum strings |
| `Player::known_opponent_city` | `PlayerState.knownOpponentCity` | string \| null | Revealed position or null |
| `Player::opponent_used_strike` | `PlayerState.opponentUsedStrike` | boolean | Action feedback |
| `Player::locate_blocked_by_deep_cover` | `PlayerState.locateBlockedByDeepCover` | boolean | Feedback flag |
| `GameState::turn_number()` | `MatchState.turnNumber` | number | Starting at 1 |
| `GameState::current_turn()` | `MatchState.currentTurn` | 'RED' \| 'BLUE' | Whose turn |

---

## Quick Integration Checklist for Stitch stitch-frontend

- [ ] Import `ClientMessageType`, `ServerMessageType`, `ActionKind`, `AbilityId` from `stitch-frontend/src/types/Messages.ts`
- [ ] Create WebSocket connection to `ws://localhost:8080` (or configurable)
- [ ] Implement `CREATE_MATCH` flow (button → message → `MATCH_CREATED` handler)
- [ ] Implement `JOIN_MATCH` flow (code input → message → `WAITING_FOR_OPPONENT` or `ERROR` handler)
- [ ] Implement `SET_PLAYER_NAME` (name input → message, optional response handling)
- [ ] Listen for `MATCH_START` → transition to game board
- [ ] Listen for `MATCH_STATE` → update board state, HUD, notifications
- [ ] Implement action buttons → `PLAYER_ACTION` messages (MOVE, STRIKE, ABILITY, CONTROL, WAIT)
- [ ] Implement `END_TURN` button → message
- [ ] Listen for `TURN_CHANGE` → update UI ownership
- [ ] Listen for `GAME_OVER` → show results
- [ ] Handle `ERROR` gracefully (no state rollback, show message)
- [ ] Display player feedback flags (opponent actions, locate blocked, etc.) as banners

---

## Testing Commands (Backend)

```bash
# Build backend
cd backend && cmake -B build && cmake --build build

# Test server
./backend/build/two_spies_server

# Check logs
tail -f backend/server.log
```

---

## Testing Commands (stitch-frontend/Stitch)

```bash
# Connect to localhost:8080
# Create match → share code
# Second client: Join match with code
# Both clients: Game starts

# Monitor browser console for [WS] log messages
```

---

## File References (Quick Lookup)

| Component | File |
|-----------|------|
| Protocol enums | `backend/include/protocol/Messages.hpp` |
| Serialization | `backend/src/protocol/Messages.cpp` |
| Session handling | `backend/src/network/Session.cpp` |
| Match logic | `backend/src/game/Match.cpp` |
| Game rules | `backend/src/game/GameState.cpp` |
| stitch-frontend messages | `stitch-frontend/src/types/Messages.ts` |
| stitch-frontend WebSocket | `stitch-frontend/src/network/WebSocketClient.ts` |
| stitch-frontend game scene | `stitch-frontend/src/game/scenes/GameScene.ts` |

