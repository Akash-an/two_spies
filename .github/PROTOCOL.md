# Two Spies — WebSocket Protocol

> All communication uses JSON over WebSocket. Every message follows the envelope format below.

---

## Message Envelope

```json
{
  "type": "MESSAGE_TYPE_ENUM",
  "sessionId": "optional-session-id",
  "payload": { }
}
```

- `type` is always a string matching one of the enums below
- `sessionId` is optional; the server tracks sessions internally
- `payload` structure depends on `type`

---

## Client → Server Messages

### `SET_PLAYER_NAME`
Register the player's codename before entering the lobby.

```json
{
  "type": "SET_PLAYER_NAME",
  "payload": {
    "name": "Shadow Fox"
  }
}
```

---

### `CREATE_MATCH`
Create a new match as the host. Server generates a 4-digit room code.

```json
{
  "type": "CREATE_MATCH",
  "payload": {}
}
```

**Server response**: `MATCH_CREATED` with the generated code, then `WAITING_FOR_OPPONENT`.

---

### `JOIN_MATCH`
Join an existing match using a room code.

```json
{
  "type": "JOIN_MATCH",
  "payload": {
    "code": "4827"
  }
}
```

**Server response**: `MATCH_CREATED` confirming the join, then `MATCH_START` for both players.

---

### `PLAYER_ACTION`
Submit a game action during your turn. All 5 action types use this message.

#### MOVE
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "MOVE",
    "targetCity": "london"
  }
}
```

#### STRIKE
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "STRIKE",
    "targetCity": "moscow"
  }
}
```

#### WAIT
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "WAIT"
  }
}
```

#### CONTROL
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "CONTROL"
  }
}
```

#### ABILITY — LOCATE
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "ABILITY",
    "abilityId": "LOCATE"
  }
}
```

#### ABILITY — DEEP_COVER
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "ABILITY",
    "abilityId": "DEEP_COVER"
  }
}
```

#### ABILITY — STRIKE_REPORT
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "ABILITY",
    "abilityId": "STRIKE_REPORT"
  }
}
```

#### ABILITY — ENCRYPTION
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "ABILITY",
    "abilityId": "ENCRYPTION"
  }
}
```

#### ABILITY — RAPID_RECON
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "ABILITY",
    "abilityId": "RAPID_RECON"
  }
}
```

#### ABILITY — PREP_MISSION
```json
{
  "type": "PLAYER_ACTION",
  "payload": {
    "action": "ABILITY",
    "abilityId": "PREP_MISSION"
  }
}
```

---

### `END_TURN`
Manually end your turn before both actions are used.

```json
{
  "type": "END_TURN",
  "payload": {}
}
```

---

### `ABORT_MATCH`
Forfeit the current match (declares the opponent as winner).

```json
{
  "type": "ABORT_MATCH",
  "payload": {}
}
```

---

### `LEAVE_MATCH`
Leave a completed match and return to lobby.

```json
{
  "type": "LEAVE_MATCH",
  "payload": {}
}
```

---

## Server → Client Messages

### `MATCH_CREATED`
Sent to host after `CREATE_MATCH`, and to guest after `JOIN_MATCH`.

```json
{
  "type": "MATCH_CREATED",
  "payload": {
    "code": "4827"
  }
}
```

---

### `WAITING_FOR_OPPONENT`
Sent to the host after `MATCH_CREATED` while waiting for the second player to join.

```json
{
  "type": "WAITING_FOR_OPPONENT",
  "payload": {}
}
```

---

### `MATCH_START`
Broadcast to both players when the second player joins. Contains the player's assigned side and the full map definition.

```json
{
  "type": "MATCH_START",
  "payload": {
    "side": "RED",
    "map": {
      "cities": [
        { "id": "nyc", "name": "New York City", "x": 0.300, "y": 0.320 },
        { "id": "london", "name": "London", "x": 0.500, "y": 0.280 }
      ],
      "edges": [
        { "from": "nyc", "to": "london" }
      ]
    }
  }
}
```

---

### `MATCH_STATE`
The main game state update, sent to each player **individually** with filtered information. Sent after every action and at turn boundaries.

```json
{
  "type": "MATCH_STATE",
  "payload": {
    "sessionId": "abc123",
    "turnNumber": 3,
    "currentTurn": "RED",
    "player": {
      "side": "RED",
      "name": "Shadow Fox",
      "currentCity": "london",
      "intel": 14,
      "actionsRemaining": 2,
      "hasCover": true,
      "knownOpponentCity": null,
      "abilities": ["LOCATE", "DEEP_COVER", "STRIKE_REPORT", "ENCRYPTION", "RAPID_RECON", "PREP_MISSION"],
      "strikeReportUnlocked": false,
      "encryptionUnlocked": false,
      "rapidReconUnlocked": false,
      "prepMissionActive": false,
      "opponentUsedStrike": false,
      "opponentUsedLocate": true,
      "opponentUsedDeepCover": false,
      "opponentUsedControl": false,
      "opponentClaimedIntel": false,
      "opponentUnlockedStrikeReport": false,
      "opponentStrikeReportActive": false,
      "locateBlockedByDeepCover": false,
      "claimedIntel": false,
      "startingCity": "nyc",
      "opponentStartingCity": "tokyo"
    },
    "opponentName": "Night Hawk",
    "gameOver": false,
    "winner": null,
    "opponentMovedFromStart": true,
    "turnDuration": 30000,
    "timeElapsedMs": 4200,
    "scheduledDisappearCity": null,
    "disappearedCities": [],
    "isPlayerStranded": false,
    "controlledCities": {
      "london": "RED"
    },
    "intelPopups": [
      { "city": "moscow", "amount": 10 }
    ],
    "actionPopups": [
      { "city": "tokyo" }
    ]
  }
}
```

**Key note**: `knownOpponentCity` is only non-null when the opponent's location has been revealed (via LOCATE or Strike Report trigger). The `map` field is only included in the first `MATCH_STATE` after `MATCH_START`.

---

### `TURN_CHANGE`
Broadcast to both players when the active turn changes.

```json
{
  "type": "TURN_CHANGE",
  "payload": {
    "previousTurn": "RED",
    "currentTurn": "BLUE",
    "reason": "actions_exhausted"
  }
}
```

Possible `reason` values:
- `"actions_exhausted"` — player used both actions
- `"end_turn_requested"` — player sent `END_TURN`
- `"timeout"` — 30-second timer expired

---

### `GAME_OVER`
Broadcast to both players when the game ends.

```json
{
  "type": "GAME_OVER",
  "payload": {
    "winner": "RED",
    "reason": "Strike successful — Shadow Fox eliminated Night Hawk"
  }
}
```

Possible `reason` string examples:
- `"Strike successful — [name] eliminated [name]"`
- `"[name] was stranded in a destroyed city"`
- `"[name] forfeited the match"`

---

### `ERROR`
Sent to the client when an action is invalid or a protocol error occurs.

```json
{
  "type": "ERROR",
  "payload": {
    "message": "Cannot move to non-adjacent city"
  }
}
```

Common error messages:
- `"Not your turn"`
- `"No actions remaining"`
- `"Cannot move to non-adjacent city"`
- `"Insufficient Intel"`
- `"Target city has disappeared"`

---

## Enum Quick Reference

### `ClientMessageType`
```
SET_PLAYER_NAME
CREATE_MATCH
JOIN_MATCH
PLAYER_ACTION
END_TURN
ABORT_MATCH
LEAVE_MATCH
```

### `ServerMessageType`
```
MATCH_CREATED
MATCH_START
MATCH_STATE
TURN_CHANGE
GAME_OVER
ERROR
WAITING_FOR_OPPONENT
```

### `ActionKind`
```
MOVE
STRIKE
ABILITY
WAIT
CONTROL
```

### `AbilityId`
```
LOCATE          (10 Intel)
DEEP_COVER      (20 Intel)
STRIKE_REPORT   (10 Intel)
ENCRYPTION      (25 Intel — permanent: hides opponent notification flags)
RAPID_RECON     (40 Intel — permanent: reveals opponent on entering their city)
PREP_MISSION    (40 Intel — per-use: grants +1 action next turn)
```

---

## Adding a New Message Type

1. Add the enum value to `ClientMessageType` or `ServerMessageType` in `stitch-frontend/src/types/Messages.ts`
2. Add the matching string constant in `backend/include/protocol/Messages.hpp`
3. Add parse/serialize handling in `backend/src/protocol/Messages.cpp`
4. Add the handler in `backend/src/game/Match.cpp` or `Session.cpp`
5. Add the TypeScript payload interface in `Messages.ts`
6. Update `protocol/schemas/` JSON schema files
7. Update this document

---

## Protocol Schema Files

Located in `protocol/schemas/`:
- `actions/player-action.schema.json` — validates `PLAYER_ACTION` payloads
- `lobby/lobby-event.schema.json` — validates lobby messages
- `state/board-state.schema.json` — validates `MATCH_STATE` payload

These are JSON Schema files used as reference; they are not currently enforced at runtime.
