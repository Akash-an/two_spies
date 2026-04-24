# Protocol Documentation Index

> **⚠️ TERMINOLOGY: "stitch-frontend" and "client" are used interchangeably. References to "frontend" always mean `stitch-frontend/`. The old `frontend/` directory is deprecated.**

**Quick guide to finding the right protocol documentation for your task.**

---

## I want to...

### 🎮 **Understand the complete game flow**
→ Read: [**INTEGRATION_GUIDE.md**](./INTEGRATION_GUIDE.md)
- Complete game session walkthrough (Create → Join → Start → Play → Game Over)
- Complex ability interactions (Deep Cover + Locate)
- Intel claiming mechanics
- Strike success/failure scenarios

### 📋 **Look up a specific message format**
→ Read: [**backend-stitch-frontend-interactions.md**](./backend-stitch-frontend-interactions.md)
- All message types (Client → Server and Server → Client)
- Detailed payload structures
- Context and backend handler locations
- Error handling & debugging notes

### ⚡ **Quick reference during coding**
→ Read: [**QUICK_REFERENCE.md**](./QUICK_REFERENCE.md)
- One-page message flow chart
- All messages (A-Z) with key details
- Validation rules by action type
- Ability quick reference
- Integration checklist
- File references

---

## Message Type Quick Index

### Client → Server Messages

| Message | Purpose | Quick Ref | Full Ref |
|---------|---------|-----------|----------|
| `CREATE_MATCH` | Host creates a room | [QR](./QUICK_REFERENCE.md#create_match) | [Full](./backend-stitch-frontend-interactions.md#1-create_match--host-creates-a-new-game-room) |
| `JOIN_MATCH` | Player joins room | [QR](./QUICK_REFERENCE.md#join_match) | [Full](./backend-stitch-frontend-interactions.md#2-join_match--joiner-enters-a-room-code) |
| `SET_PLAYER_NAME` | Set display name | [QR](./QUICK_REFERENCE.md#set_player_name) | [Full](./backend-stitch-frontend-interactions.md#3-set_player_name--set-display-name) |
| `PLAYER_ACTION` | Execute action | [QR](./QUICK_REFERENCE.md#player_action) | [Full](./backend-stitch-frontend-interactions.md#4-player_action--execute-an-action) |
| `END_TURN` | Pass control | [QR](./QUICK_REFERENCE.md#end_turn) | [Full](./backend-stitch-frontend-interactions.md#5-end_turn--finish-turn-and-pass-control) |

### Server → Client Messages

| Message | Purpose | Quick Ref | Full Ref |
|---------|---------|-----------|----------|
| `MATCH_CREATED` | Room created | [QR](./QUICK_REFERENCE.md#match_created) | [Full](./backend-stitch-frontend-interactions.md#1-match_created--room-created-successfully) |
| `WAITING_FOR_OPPONENT` | Joined, waiting | [QR](./QUICK_REFERENCE.md#waiting_for_opponent) | [Full](./backend-stitch-frontend-interactions.md#2-waiting_for_opponent--joined-successfully) |
| `MATCH_START` | Game begins | [QR](./QUICK_REFERENCE.md#match_start) | [Full](./backend-stitch-frontend-interactions.md#3-match_start--both-players-present) |
| `MATCH_STATE` | Current state | [QR](./QUICK_REFERENCE.md#match_state) | [Full](./backend-stitch-frontend-interactions.md#4-match_state--current-game-state) |
| `TURN_CHANGE` | Turn transitioned | [QR](./QUICK_REFERENCE.md#turn_change) | [Full](./backend-stitch-frontend-interactions.md#5-turn_change--turn-transitioned) |
| `GAME_OVER` | Game ended | [QR](./QUICK_REFERENCE.md#game_over) | [Full](./backend-stitch-frontend-interactions.md#6-game_over--game-ended) |
| `ERROR` | Error occurred | [QR](./QUICK_REFERENCE.md#error) | [Full](./backend-stitch-frontend-interactions.md#7-error--error-occurred) |

---

## Deep Dives

### By Feature

- **Lobby & Matchmaking** → [INTEGRATION_GUIDE.md - Complete Game Session](./INTEGRATION_GUIDE.md#complete-game-session-flow)
- **Combat & Strike Mechanic** → [INTEGRATION_GUIDE.md - Strike Succeeds](./INTEGRATION_GUIDE.md#scenario-strike-succeeds--game-ends)
- **Abilities & Deep Cover** → [INTEGRATION_GUIDE.md - Deep Cover Blocks Locate](./INTEGRATION_GUIDE.md#scenario-deep_cover-blocks-locate)
- **Intel System** → [INTEGRATION_GUIDE.md - Intel Control & Intel Claiming](./INTEGRATION_GUIDE.md#scenario-intel-control--city-claiming)
- **Turn Timer** → [QUICK_REFERENCE.md - Turn Management](./QUICK_REFERENCE.md)
- **UI Notifications** → [INTEGRATION_GUIDE.md - Notification Patterns](./INTEGRATION_GUIDE.md#notification-patterns)

### By Component

- **stitch-frontend GameScene** → [backend-stitch-frontend-interactions.md - References](./backend-stitch-frontend-interactions.md#references)
- **Backend Session** → [backend-stitch-frontend-interactions.md - References](./backend-stitch-frontend-interactions.md#references)
- **Backend Match** → [backend-stitch-frontend-interactions.md - Match State Structure](./backend-stitch-frontend-interactions.md#match-state-matchstate-struct)
- **Backend GameState** → [backend-stitch-frontend-interactions.md - Game State Structure](./backend-stitch-frontend-interactions.md#game-state-structure)
- **Message Serialization** → [backend-stitch-frontend-interactions.md - Serialization Map](./QUICK_REFERENCE.md#serialization-map-backend--stitch-frontend)

---

## Code Examples

### Setup WebSocket Connection
[INTEGRATION_GUIDE.md - Step 1](./INTEGRATION_GUIDE.md#step-1-player-creates-match)

### Send an Action
[INTEGRATION_GUIDE.md - Step 4](./INTEGRATION_GUIDE.md#step-4-red-players-turn-1)

### Handle Server Response
[INTEGRATION_GUIDE.md - Notification Patterns](./INTEGRATION_GUIDE.md#notification-patterns)

### Validate stitch-frontend Action
[INTEGRATION_GUIDE.md - Validation by stitch-frontend](./INTEGRATION_GUIDE.md#validation-by-stitch-frontend-to-reduce-errors)

### Implement Action Button State Machine
[INTEGRATION_GUIDE.md - Action Button State Machine](./INTEGRATION_GUIDE.md#action-button-state-machine)

### Update HUD from State
[INTEGRATION_GUIDE.md - HUD Update Pattern](./INTEGRATION_GUIDE.md#hud-update-pattern)

---

## Common Scenarios

### Scenario: "I want to Move from Prague to Berlin"
1. Read: [QUICK_REFERENCE.md - MOVE Action](./QUICK_REFERENCE.md#move)
2. Code: [INTEGRATION_GUIDE.md - stitch-frontend Implementation](./INTEGRATION_GUIDE.md#step-4-red-players-turn-1)
3. Backend: [backend-stitch-frontend-interactions.md - MOVE validation](./backend-stitch-frontend-interactions.md#41-move)

### Scenario: "Opponent used Deep Cover, now Locate is blocked"
1. Read: [INTEGRATION_GUIDE.md - Deep Cover Blocks Locate](./INTEGRATION_GUIDE.md#scenario-deep_cover-blocks-locate)
2. Field reference: [QUICK_REFERENCE.md - Player State Flags](./QUICK_REFERENCE.md#player-state-flags-feedback)
3. Backend details: [backend-stitch-frontend-interactions.md - LOCATE ability](./backend-stitch-frontend-interactions.md#locate)

### Scenario: "How do I display the opponent's known position?"
1. Read: [QUICK_REFERENCE.md - knownOpponentCity field](./QUICK_REFERENCE.md#serialization-map-backend--stitch-frontend)
2. Implementation: [INTEGRATION_GUIDE.md - Board Update Pattern](./INTEGRATION_GUIDE.md#hud-update-pattern)
3. Trigger conditions: [backend-stitch-frontend-interactions.md - Strike logic](./backend-stitch-frontend-interactions.md#42-strike)

### Scenario: "Connection lost or error received"
1. Error types: [backend-stitch-frontend-interactions.md - Error Handling](./backend-stitch-frontend-interactions.md#error-handling)
2. stitch-frontend recovery: [INTEGRATION_GUIDE.md - Error Recovery](./INTEGRATION_GUIDE.md#error-recovery)
3. Validation: [INTEGRATION_GUIDE.md - Validation by stitch-frontend](./INTEGRATION_GUIDE.md#validation-by-stitch-frontend-to-reduce-errors)

---

## File Structure

```
docs/protocol/
├── README.md (this file)
├── backend-stitch-frontend-interactions.md
│   └── Complete reference with all messages, backends handlers, structures
├── QUICK_REFERENCE.md
│   └── Tables, message charts, quick lookup
└── INTEGRATION_GUIDE.md
    └── Step-by-step flows, code examples, patterns
```

---

## Key Files Referenced

### stitch-frontend

- **Messages & Enums**: `stitch-frontend/src/types/Messages.ts`
- **WebSocket Client**: `stitch-frontend/src/network/WebSocketClient.ts`
- **Game Scene**: `stitch-frontend/src/game/scenes/GameScene.ts`
- **Lobby Scene**: `stitch-frontend/src/game/scenes/LobbyScene.ts`

### Backend

- **Protocol Messages**: `backend/include/protocol/Messages.hpp`, `backend/src/protocol/Messages.cpp`
- **Session Handler**: `backend/include/network/Session.hpp`, `backend/src/network/Session.cpp`
- **Match Manager**: `backend/include/game/MatchManager.hpp` (implied)
- **Match Logic**: `backend/include/game/Match.hpp`, `backend/src/game/Match.cpp`
- **Game Rules**: `backend/include/game/GameState.hpp`, `backend/src/game/GameState.cpp`

---

## Workflow Tips

### For stitch-frontend Integration

1. **Start here**: [QUICK_REFERENCE.md - Quick Integration Checklist](./QUICK_REFERENCE.md#quick-integration-checklist-for-stitch-stitch-frontend)
2. **Understand flow**: [INTEGRATION_GUIDE.md - Complete Game Session](./INTEGRATION_GUIDE.md#complete-game-session-flow)
3. **Implement features**: [INTEGRATION_GUIDE.md - UI State Management](./INTEGRATION_GUIDE.md#ui-state-management)
4. **Debug issues**: [backend-stitch-frontend-interactions.md - Debugging Notes](./backend-stitch-frontend-interactions.md#debugging-notes)

### For Backend Maintenance

1. **Message format reference**: [backend-stitch-frontend-interactions.md - Message Payloads](./backend-stitch-frontend-interactions.md#message-payloads)
2. **Serialization map**: [QUICK_REFERENCE.md - Serialization Map](./QUICK_REFERENCE.md#serialization-map-backend--stitch-frontend)
3. **Game logic flows**: [INTEGRATION_GUIDE.md - Complex Ability Interactions](./INTEGRATION_GUIDE.md#complex-ability-interactions)

### For Bug Investigation

1. **Check logs**: [backend-stitch-frontend-interactions.md - Backend Logging](./backend-stitch-frontend-interactions.md#backend-logging)
2. **Identify message mismatch**: [backend-stitch-frontend-interactions.md - Common Issues](./backend-stitch-frontend-interactions.md#common-issues)
3. **Trace game logic**: [INTEGRATION_GUIDE.md - Detailed flows by step](./INTEGRATION_GUIDE.md#complete-game-session-flow)

---

## Version Info

- **Last Updated**: 2026-04-04
- **Backend**: C++17, Boost.Asio/Beast
- **stitch-frontend**: Phaser 3, TypeScript (old), Stitch/React (new)
- **Protocol**: JSON over WebSocket
- **Default**: `ws://localhost:8080`

---

## Questions?

- **"How does X feature work?"** → Search scenario in [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
- **"What's the payload for Y message?"** → Look up in [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) or [backend-stitch-frontend-interactions.md](./backend-stitch-frontend-interactions.md)
- **"Where's the code for Z?"** → Check [References section](./backend-stitch-frontend-interactions.md#references) or search in QUICK_REFERENCE
- **"Why is my action failing?"** → See [Error Handling](./backend-stitch-frontend-interactions.md#error-handling) or [Validation Rules](./QUICK_REFERENCE.md#action-type--validation-rules)

