# Backend ↔ stitch-frontend Interactions

> **⚠️ TERMINOLOGY (Critical): "frontend" now ALWAYS refers to `stitch-frontend/` — the canonical client codebase. The older `frontend/` directory is **DEPRECATED** and must NOT be used. References to "frontend" in this document mean `stitch-frontend/`.**

This document maps all protocol interactions between the **C++ backend** and the **stitch-frontend (React/TypeScript)** for the Two Spies multiplayer game.

**Table of Contents:**
1. [Connection Lifecycle](#connection-lifecycle)
2. [Client → Server Messages](#client--server-messages)
3. [Server → Client Messages](#server--client-messages)
4. [Game State Structure](#game-state-structure)
5. [Message Payloads](#message-payloads)
6. [Error Handling](#error-handling)
7. [Debugging Notes](#debugging-notes)

---

## Connection Lifecycle

### 1. WebSocket Connection Establishment

**Initiator:** stitch-frontend (Browser)

```typescript
// stitch-frontend/src/network/WebSocketClient.ts
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  // Connection ready
  // Player can now send CREATE_MATCH or JOIN_MATCH
};

ws.onerror = (e) => {
  // Handle connection error
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // Dispatch to event handlers by message.type
  this.emit(msg.type, msg);
};

ws.onclose = () => {
  // Connection closed
};
```

**Backend:** [backend/src/network/Session.cpp](../backend/src/network/Session.cpp)
- Each connected client gets a unique `Session` instance
- `Session::run()` initiates WebSocket handshake
- A unique `player_id` is generated server-side

### 2. Session Initialization

**Backend generates:**
- Unique `player_id` (hex string, ~12 chars)
- Stores `player_name` (set via `SET_PLAYER_NAME` message)

---

## Client → Server Messages

### 1. `CREATE_MATCH` — Host creates a new game room

**stitch-frontend Source:** [stitch-frontend/src/game/scenes/LobbyScene.ts](../stitch-frontend/src/game/scenes/LobbyScene.ts)

**Message Format:**
```json
{
  "type": "CREATE_MATCH",
  "payload": {}
}
```

**Backend Handler:** [backend/src/game/MatchManager.cpp](../backend/src/game/MatchManager.cpp) (via Session routing)
- Creates new `Match` instance
- Generates room `code` (4-6 alphanumeric)
- Returns `MATCH_CREATED` response with code

**Response:** `MATCH_CREATED`

---

### 2. `JOIN_MATCH` — Joiner enters a room code

**stitch-frontend Source:** [stitch-frontend/src/game/scenes/LobbyScene.ts](../stitch-frontend/src/game/scenes/LobbyScene.ts)

**Message Format:**
```json
{
  "type": "JOIN_MATCH",
  "payload": {
    "code": "ABC123"
  }
}
```

**Backend Handler:** [backend/src/game/MatchManager.cpp](../backend/src/game/MatchManager.cpp)
- Looks up match by `code`
- Adds joiner to match (`Match::add_player()`)
- Assigns side (RED or BLUE)
- If both players present, auto-starts match via `Match::start(seed)`

**Response:**
- If match not found: `ERROR` with message
- If successful: `MATCH_START` (broadcast to both players)

---

### 3. `SET_PLAYER_NAME` — Set display name

**stitch-frontend Source:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts) (typically during LobbyScene)

**Message Format:**
```json
{
  "type": "SET_PLAYER_NAME",
  "payload": {
    "name": "Agent Shadow"
  }
}
```

**Backend Handler:** [backend/src/network/Session.cpp](../backend/src/network/Session.cpp)
- Stores name in `Session::player_name_`
- Propagates to `Match::set_player_name(player_id, name)`
- Name appears in opponent's `MATCH_STATE` as `opponentName`

**Response:** None (async update). Name will appear in next `MATCH_STATE` broadcast.

---

### 4. `PLAYER_ACTION` — Execute an action (move, strike, ability, control)

**stitch-frontend Source:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)

**Message Format:**
```json
{
  "type": "PLAYER_ACTION",
  "sessionId": "SESSION_ID",
  "payload": {
    "action": "MOVE|STRIKE|ABILITY|CONTROL|WAIT",
    "targetCity": "city_id",
    "abilityId": "DEEP_COVER|ENCRYPTION|LOCATE|STRIKE_REPORT|RAPID_RECON|PREP_MISSION"
  }
}
```

**Action Types:**

#### 4.1 MOVE
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "MOVE",
    "targetCity": "new_city_id"
  }
}
```
- Moves player from current city to adjacent city
- Backend validates city is adjacent via `CityGraph::is_adjacent()`
- Costs 1 action

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp) `use_action()` → `ActionKind::MOVE`

#### 4.2 STRIKE
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "STRIKE",
    "targetCity": "opponent_city_id"
  }
}
```
- Attempt to strike opponent if in target city
- If strike succeeds → game ends, sender wins
- If strike fails → attacker's position revealed to opponent
- Reveals position even if target is empty
- Costs 1 action

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp) `use_action()` → `ActionKind::STRIKE`

**Result flags (in next MATCH_STATE):**
- `player.opponentUsedStrike` → opponent attempted strike
- `player.knownOpponentCity` → if strike failed, now revealed

#### 4.3 ABILITY
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "ABILITY",
    "abilityId": "LOCATE|DEEP_COVER|ENCRYPTION|STRIKE_REPORT|RAPID_RECON|PREP_MISSION",
    "targetCity": "city_id (optional, depends on ability)"
  }
}
```

**Ability Details:**

##### DEEP_COVER
- Hides player position for 2 turns
- Blocks opponent's LOCATE attempts while active
- No target city needed

```json
{
  "action": "ABILITY",
  "abilityId": "DEEP_COVER"
}
```

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp) line 251
- Sets `player.deep_cover_active = true`
- Sets `player.deep_cover_used_on_turn = current_turn`
- Persists for 2 turns, then auto-clears

**stitch-frontend Feedback:**
- `player.opponentUsedDeepCover` → flag set in MATCH_STATE
- `player.deepCoverText` → display "DEEP COVER ACTIVE" on HUD

##### LOCATE
- Reveals opponent's current city (if not in Deep Cover)
- If opponent in Deep Cover, locate blocked + reveals striker position

```json
{
  "action": "ABILITY",
  "abilityId": "LOCATE"
}
```

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp) line 263
- If opponent NOT in Deep Cover:
  - Sets `player.known_opponent_city = opponent.current_city`
- If opponent IN Deep Cover:
  - Sets `player.locate_blocked_by_deep_cover = true`
  - Reveals `opponent.known_opponent_city = player.current_city` (striker position)

**stitch-frontend Feedback:**
- `player.knownOpponentCity` → opponent's city (if successful)
- `player.opponentUsedLocate` → locate was used (even if blocked)
- `player.locateBlockedByDeepCover` → locate was blocked by Deep Cover
- Banners show feedback to player

##### ENCRYPTION (Under Development)
- Protects accumulated Intel from theft
- Cost: 1 action

##### STRIKE_REPORT (Under Development)
- Reveals opponent's last-known location to player

##### RAPID_RECON (Under Development)
- Moves 2 cities in one action

##### PREP_MISSION (Under Development)
- Placeholder for future ability expansion

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp) `use_ability()`

#### 4.4 CONTROL
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "CONTROL"
  }
}
```
- Claim Intel at current city (if available)
- Grants 10 Intel to player
- Costs 1 action

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp)
- Sets `player.claimed_intel_this_turn = true`
- Updates `result.controlledCities[current_city] = player.side`
- Increases `player.intel` by 10

#### 4.5 WAIT
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "WAIT"
  }
}
```
- Pass remaining action, keep position unchanged
- Costs 1 action
- Can be used to end turn early

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp)
- Simply decrements `actions_remaining`

---

### 5. `END_TURN` — Finish turn and pass control

**stitch-frontend Source:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)

**Message Format:**
```json
{
  "type": "END_TURN",
  "sessionId": "SESSION_ID",
  "payload": {}
}
```

**Backend Handler:** [backend/src/game/Match.cpp](../backend/src/game/Match.cpp) `handle_end_turn()`
1. Validates it's the calling player's turn
2. Calls `GameState::end_turn()`
3. Clears action tracking flags
4. Checks for turn timeout expiry
5. Broadcasts `TURN_CHANGE` to both players
6. Sends new `MATCH_STATE` for next player

**Response:** `TURN_CHANGE` + `MATCH_STATE`

---

## Server → Client Messages

### 1. `MATCH_CREATED` — Room created successfully

**Sent:** Immediately after `CREATE_MATCH`

**Message Format:**
```json
{
  "type": "MATCH_CREATED",
  "sessionId": "SESSION_ID",
  "payload": {
    "code": "ABC123",
    "sessionId": "SESSION_ID"
  }
}
```

**stitch-frontend Handler:** [stitch-frontend/src/game/scenes/LobbyScene.ts](../stitch-frontend/src/game/scenes/LobbyScene.ts)
- Store `code` for display to room host
- Allow host to share code with opponent
- Transition to "Waiting for opponent" state
- Listen for `MATCH_START`

---

### 2. `WAITING_FOR_OPPONENT` — Joined successfully, waiting for second player

**Sent:** After `JOIN_MATCH` succeeds

**Message Format:**
```json
{
  "type": "WAITING_FOR_OPPONENT",
  "sessionId": "SESSION_ID",
  "payload": {}
}
```

**stitch-frontend Handler:** [stitch-frontend/src/game/scenes/LobbyScene.ts](../stitch-frontend/src/game/scenes/LobbyScene.ts)
- Show "Waiting for opponent..." message
- Listen for `MATCH_START`

---

### 3. `MATCH_START` — Both players present, game begins

**Sent:** When second player joins (via `Match::start()`)

**Message Format:**
```json
{
  "type": "MATCH_START",
  "sessionId": "SESSION_ID",
  "payload": {
    "sessionId": "SESSION_ID",
    "player": {
      "side": "RED" | "BLUE",
      "startingCity": "city_id",
      "opponentStartingCity": "opponent_city_id"
    }
  }
}
```

**stitch-frontend Handler:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)
- Transition to GameScene
- Store session ID globally
- Initialize board renderer with map
- Display player's starting city
- Start listening for `MATCH_STATE`

**Backend:** [backend/src/game/Match.cpp](../backend/src/game/Match.cpp) `start()`
- Assigns starting cities randomly (per Gdd)
- Calls `GameState::initialize()`
- Broadcasts `MATCH_START` to both players
- Immediately broadcasts initial `MATCH_STATE`

---

### 4. `MATCH_STATE` — Current game state (per-player filtered)

**Sent:** 
- After `MATCH_START` (initial state)
- After each `PLAYER_ACTION`
- After each `END_TURN`
- Periodically every 500ms for timer updates

**Message Format:**
```json
{
  "type": "MATCH_STATE",
  "sessionId": "SESSION_ID",
  "payload": {
    "sessionId": "SESSION_ID",
    "turnNumber": 1,
    "currentTurn": "RED" | "BLUE",
    "player": {
      "side": "RED" | "BLUE",
      "name": "Agent Shadow",
      "currentCity": "city_id",
      "intel": 0,
      "actionsRemaining": 2,
      "hasCover": false,
      "abilities": ["DEEP_COVER", "LOCATE", "STRIKE_REPORT", ...],
      "knownOpponentCity": "city_id" | null,
      "opponentUsedStrike": false,
      "opponentUsedLocate": false,
      "opponentUsedDeepCover": false,
      "locateBlockedByDeepCover": false,
      "startingCity": "city_id",
      "opponentStartingCity": "city_id",
      "claimedIntel": false
    },
    "opponentName": "Agent Phantom",
    "map": {
      "cities": [
        { "id": "moscow", "name": "Moscow", "x": 0.5, "y": 0.3 },
        ...
      ],
      "edges": [
        { "from": "moscow", "to": "berlin" },
        ...
      ]
    },
    "gameOver": false,
    "winner": null,
    "opponentMovedFromStart": false,
    "scheduledDisappearCity": "city_id" | null,
    "disappearedCities": ["city_id", ...],
    "isPlayerStranded": false,
    "controlledCities": {
      "moscow": "RED",
      "berlin": "BLUE",
      ...
    },
    "intelPopups": [
      { "city": "prague", "amount": 10 },
      ...
    ],
    "turnStartTime": 0,
    "turnDuration": 15000,
    "timeElapsedMs": 1234
  }
}
```

**stitch-frontend Handler:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)
- Update `this.state` with new MatchState
- Detect action notifications:
  - `player.opponentUsedStrike` → show banner
  - `player.locateBlockedByDeepCover` → show banner
  - `player.opponentUsedDeepCover` → show banner
  - `player.opponentUsedLocate` → show banner
  - `player.claimedIntel` → show banner
- Update board:
  - Render controlled cities
  - Show Intel pop-ups
  - Show opponent's known position (if revealed)
  - Show disappearing cities
- Update HUD:
  - Actions remaining
  - Intel count
  - Current turn indicator
  - Timer (calculate from `timeElapsedMs` + client clock)

**Backend Source:** [backend/src/protocol/Messages.cpp](../backend/src/protocol/Messages.cpp) `serialize_match_state()`

---

### 5. `TURN_CHANGE` — Turn transitioned to next player

**Sent:** Immediately after `END_TURN` or timeout

**Message Format:**
```json
{
  "type": "TURN_CHANGE",
  "sessionId": "SESSION_ID",
  "payload": {
    "turnNumber": 2,
    "currentTurn": "BLUE"
  }
}
```

**stitch-frontend Handler:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)
- If it's now the player's turn:
  - Enable action buttons
  - Start turn timer
- If it's opponent's turn:
  - Disable action buttons
  - Show opponent's timer
  - Wait for next `MATCH_STATE`

**Backend:** [backend/src/game/Match.cpp](../backend/src/game/Match.cpp) `handle_end_turn()`

---

### 6. `GAME_OVER` — Game ended

**Sent:** When strike succeeds or win condition met

**Message Format:**
```json
{
  "type": "GAME_OVER",
  "sessionId": "SESSION_ID",
  "payload": {
    "winner": "RED" | "BLUE",
    "reason": "STRIKE_SUCCESS" | "OPPONENT_DISCONNECTED" | ...
  }
}
```

**stitch-frontend Handler:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)
- Disable action buttons
- Show victory/defeat banner
- Display winner name
- Offer "Play Again" button

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp) `check_strike_result()`

---

### 7. `ERROR` — Error occurred

**Sent:** On validation failure, malformed message, invalid action, etc.

**Message Format:**
```json
{
  "type": "ERROR",
  "sessionId": "SESSION_ID",
  "payload": {
    "message": "Action validation failed: city not adjacent"
  }
}
```

**Error Cases:**
- Invalid city ID
- City not adjacent (for MOVE)
- Target city not reachable
- No actions remaining
- Action sent on opponent's turn
- Malformed payload
- Player not in match
- Match already started

**stitch-frontend Handler:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)
- Log to console
- Optionally show toast notification to player
- Preserve game state (no rollback)

---

## Game State Structure

### Per-Player State (Player struct)

Backend type: `game::Player` ([backend/include/game/Player.hpp](../backend/include/game/Player.hpp))

Serialized to JSON in `MATCH_STATE`:

```typescript
interface PlayerState {
  side: 'RED' | 'BLUE';
  name: string;
  currentCity: string;
  intel: number;
  actionsRemaining: number;
  hasCover: boolean;
  abilities: string[];
  knownOpponentCity?: string | null;
  opponentUsedStrike: boolean;
  opponentUsedLocate: boolean;
  opponentUsedDeepCover: boolean;
  locateBlockedByDeepCover: boolean;
  startingCity: string;
  opponentStartingCity: string;
  claimedIntel: boolean;
}
```

### Match State (MatchState struct)

Backend type: `game::GameState` ([backend/include/game/GameState.hpp](../backend/include/game/GameState.hpp))

Serialized to JSON:

```typescript
interface MatchState {
  sessionId: string;
  turnNumber: number;
  currentTurn: 'RED' | 'BLUE';
  player: PlayerState;
  opponentName: string;
  map: MapDef;
  gameOver: boolean;
  winner: 'RED' | 'BLUE' | null;
  opponentMovedFromStart: boolean;
  scheduledDisappearCity?: string | null;
  disappearedCities: string[];
  isPlayerStranded: boolean;
  controlledCities: Record<string, 'RED' | 'BLUE'>;
  intelPopups: IntelPopup[];
  turnStartTime: number;
  turnDuration: number;
  timeElapsedMs: number;
}
```

### City Graph (MapDef struct)

```typescript
interface MapDef {
  cities: CityDef[];
  edges: EdgeDef[];
}

interface CityDef {
  id: string;
  name: string;
  x: number;  // normalized 0-1
  y: number;
}

interface EdgeDef {
  from: string;  // city id
  to: string;    // city id
}
```

---

## Message Payloads

### Action Payloads

#### MOVE Action
```typescript
interface MovePayload {
  action: 'MOVE';
  targetCity: string;
}
```

#### STRIKE Action
```typescript
interface StrikePayload {
  action: 'STRIKE';
  targetCity: string;
}
```

#### ABILITY Action
```typescript
interface AbilityPayload {
  action: 'ABILITY';
  abilityId: 'DEEP_COVER' | 'ENCRYPTION' | 'LOCATE' | 'STRIKE_REPORT' | 'RAPID_RECON' | 'PREP_MISSION';
  targetCity?: string;  // Some abilities don't need target
}
```

#### CONTROL Action
```typescript
interface ControlPayload {
  action: 'CONTROL';
}
```

#### WAIT Action
```typescript
interface WaitPayload {
  action: 'WAIT';
}
```

---

## Error Handling

### Client-Side Error Recovery

**stitch-frontend:** [stitch-frontend/src/network/WebSocketClient.ts](../stitch-frontend/src/network/WebSocketClient.ts)

```typescript
ws.onerror = (e) => {
  console.error('[WS] Connection error:', e);
  // TODO: Implement reconnection logic with exponential backoff
};

ws.onclose = () => {
  console.info('[WS] Connection closed');
  // TODO: Detect unexpected closure and attempt reconnect
};
```

**Current Status:** Basic error logging only. No auto-reconnect yet.

### Server-Side Validation

**Backend:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp)

All actions validated before state update:
- City exists in graph
- City is adjacent (for MOVE)
- Action sender is current player
- Actions remaining > 0
- Target is valid for action type

If validation fails → `ERROR` message sent, state unchanged.

### Turn Timeout

**Backend:** [backend/src/game/Match.cpp](../backend/src/game/Match.cpp)

```cpp
constexpr long long TURN_DURATION_MS = 15000;  // 15 seconds
```

- After 15 seconds, turn automatically forfeit
- Remaining actions discarded
- Turn passes to opponent
- `TURN_CHANGE` broadcast to both players

**stitch-frontend:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)
- Displays countdown timer
- Shows "Time up!" message when timeout occurs
- Disables action buttons for opponent's turn

---

## Debugging Notes

### Backend Logging

**Server Log:** `backend/server.log`

Key log points:
```
[Session] New player: <player_id>
[MatchManager] CREATE_MATCH → code <CODE>
[MatchManager] JOIN_MATCH → code <CODE> joined
[Match] Both players joined, starting game
[GameState] MOVE <player> <from> → <to>
[GameState] STRIKE <player> → <target>
[GameState] ABILITY <player> <ability>
[SERIALIZE] Player <side>: locateBlockedByDeepCover=<bool>
```

### stitch-frontend Logging

**Browser Console:**
```typescript
[WS] ✓ Connected to ws://localhost:8080
[WS] → Sending: CREATE_MATCH ...
[WS] ← Received: MATCH_CREATED ...
```

### Common Issues

#### 1. Message Type Mismatch

**Backend sends:** `ServerMsgType::MATCH_STATE` → serialized as `"MATCH_STATE"`
**stitch-frontend expects:** `ServerMessageType.MATCH_STATE` → string `"MATCH_STATE"`

These MUST match. Check [stitch-frontend/src/types/Messages.ts](../stitch-frontend/src/types/Messages.ts) line 11 enum.

#### 2. Missing Field in Serialization

**Issue:** stitch-frontend expects field `knownOpponentCity` but backend sends `null` or omits it.

**Fix:** Check [backend/src/protocol/Messages.cpp](../backend/src/protocol/Messages.cpp) line 120 — ensure all TypeScript interface fields are serialized.

#### 3. Deep Cover Flag Not Set

**Issue:** `locateBlockedByDeepCover` always false even when blocked.

**Debug:**
1. Check `Player::deep_cover_active` is true when Locate attempted
2. Check `Player::deep_cover_used_on_turn` is correctly set/cleared
3. Verify turn transition doesn't prematurely clear Deep Cover
4. Check `turns_since_use >= 2` logic in `end_turn()`

**Logging:** Backend adds `fprintf` at [backend/src/protocol/Messages.cpp](../backend/src/protocol/Messages.cpp) line 120.

#### 4. WebSocket Handshake Failure

**Issue:** Connection error immediately after connect

**Check:**
- Backend listening on correct port (default 8080)
- No firewall blocking port
- Backend started before client tries to connect
- WebSocket URL matches backend address

#### 5. Stale State on Reconnect

**Note:** Current implementation has no reconnection/session recovery. Disconnecting means game loss. Future work: implement session persistence.

---

## References

- **Backend Entry:** [backend/src/main.cpp](../backend/src/main.cpp)
- **Session Handling:** [backend/src/network/Session.cpp](../backend/src/network/Session.cpp)
- **Message Protocol:** [backend/src/protocol/Messages.cpp](../backend/src/protocol/Messages.cpp)
- **Game Logic:** [backend/src/game/GameState.cpp](../backend/src/game/GameState.cpp)
- **stitch-frontend Messages:** [stitch-frontend/src/types/Messages.ts](../stitch-frontend/src/types/Messages.ts)
- **stitch-frontend WebSocket:** [stitch-frontend/src/network/WebSocketClient.ts](../stitch-frontend/src/network/WebSocketClient.ts)
- **stitch-frontend GameScene:** [stitch-frontend/src/game/scenes/GameScene.ts](../stitch-frontend/src/game/scenes/GameScene.ts)
- **Schema Definitions:** [protocol/schemas/](../protocol/schemas/) (JSON schemas for validation)
- **Game Design Doc:** [docs/game_design/game_design_doc.md](../game_design/game_design_doc.md)

