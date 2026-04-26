# Backend ↔ stitch-frontend Integration Guide

Detailed flow examples and integration patterns for stitch-frontend developers.

---

## 1. Complete Game Session Flow

### Step 1: Player Creates Match
1. **Frontend:** Sends `CREATE_MATCH`.
2. **Backend:** Generates a room code (e.g., `ABC123`) and returns `MATCH_CREATED`.
3. **Frontend:** Displays the code for the opponent to join.

### Step 2: Player Sets Name
1. **Frontend:** Sends `SET_PLAYER_NAME` with the codename.
2. **Backend:** Stores the name and includes it in future `MATCH_STATE` updates.

### Step 3: Opponent Joins Match
1. **Opponent:** Sends `JOIN_MATCH` with the code.
2. **Backend:** Validates code, assigns sides (RED/BLUE), and broadcasts `MATCH_START` to both.
3. **Both:** Transition to the tactical map (`GameScene`).

### Step 4: Gameplay Loop
1. **Active Player:** Takes up to 2 actions (Move, Strike, Ability).
2. **Backend:** Validates and broadcasts `MATCH_STATE` after every action.
3. **Turn End:** Either automatic (after 2 actions) or manual (`END_TURN`).

---

## 2. Complex Ability Interactions

### Deep Cover vs. Locate
- **Scenario:** Player B activates **Deep Cover**.
- **Action:** Player A uses **Locate**.
- **Result:** Locate is blocked. Player A's position is revealed to Player B as a penalty. Player A receives `locateBlockedByDeepCover: true`.

### Strike Miss Penalty
- **Action:** Player A strikes a city where Player B is NOT present.
- **Result:** Player A's current position is revealed to Player B. Player B receives `knownOpponentCity` update.

---

## 3. UI State Management

### Action Buttons
- Buttons should be disabled if:
  - It is not the player's turn.
  - `actionsRemaining` is 0.
  - The player has insufficient Intel for an ability.
  - The player is "stranded" (must move out of a disappearing city).

### Banners & Notifications
Use flags in `MATCH_STATE` to trigger one-time banners:
- `opponentUsedStrike`: "Opponent attempted strike!"
- `locateBlockedByDeepCover`: "Locate blocked! Your position revealed!"
- `opponentUsedDeepCover`: "Opponent activated Deep Cover!"

---

## 4. Error Recovery
- **Validation:** Frontend should pre-validate moves (e.g., adjacency) to reduce `ERROR` messages.
- **Graceful Failure:** If the backend returns `ERROR`, display a notification but do not roll back the local state.
