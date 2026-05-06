# Game Persistence & Stickiness Architecture

This document outlines the architecture and implementation plan for adding game session stickiness. The goal is to allow active games to survive browser refreshes, and to support joining games via URL sharing plus a 4-digit password (frequency).

## 1. Architectural Decisions & Reasoning

### 1.1 Do we need a database?
**Decision: No.**
**Reasoning:** Matches are inherently transient. If the backend server restarts, all active matches are lost anyway, which is acceptable for a fast-paced browser game. We will continue to store matches entirely in memory within the `MatchManager`. Stickiness simply means reconnecting a dropped WebSocket to an *existing* in-memory match using a persistent client-side identity.

### 1.2 Client Identity (`player_token`)
**Decision:** The frontend will generate a UUID (`player_token`) and store it in `localStorage`.
**Reasoning:** Currently, the backend generates a random `player_id` for every WebSocket connection. If a user refreshes, they get a new `player_id` and the server forgets them. By having the client persist its own token, a returning WebSocket connection can authenticate itself as the same user.

### 1.3 URL Structure & Routing
**Decision:** We will use path-based routing to represent the active match. E.g., `/match/<session_id>-<code>`.
**Reasoning:** URLs allow players to easily share a direct link to a game room. When a game is created, the URL updates. If a player refreshes, the app reads the `session_id` and `code` from the URL, reads the `player_token` from `localStorage`, and attempts to reconnect.

### 1.4 The 4-Digit Password (Frequency)
**Decision:** The 4-digit frequency code will act as a room password rather than the sole identifier.
**Reasoning:** 
- **Creating a match:** Returns `session_id` and `code`. The creator's URL becomes `/match/<session_id>-<code>`. They share the URL.
- **Reconnecting:** If a player with a known `player_token` (already part of the match as Alpha or Beta) joins the match, the server lets them in immediately.
- **Joining as Opponent:** A new player clicks the URL, which contains the `code` in the path. The frontend automatically attempts to `JOIN_MATCH` using the provided code.

### 1.5 Handling Disconnects vs. Abandons
**Decision:** Dropping a WebSocket connection (e.g., refresh or temporary network drop) will *no longer* clear the player from the `Match`.
**Reasoning:** To allow reconnects, the match must remember the `player_token`. We only clear a player if they explicitly send an `ABORT_MATCH` or `LEAVE_MATCH` message, or if the match ends naturally. Turn timeouts will continue to function normally even if a player is disconnected.

---

## 2. Implementation Plan

### Phase 1: Protocol & Backend Session Updates
1. **Frontend `localStorage` Token**: Update `WebSocketClient.ts` to generate and store a `two_spies_token` in `localStorage`.
2. **`AUTHENTICATE` Message**: Add a new `ClientMsgType::AUTHENTICATE` message containing the `player_token` and `name`.
3. **Backend `Session`**: Update `Session.cpp` to expect `AUTHENTICATE` as the first message. The `Session` will update its `player_id_` to match the provided token instead of generating one.

### Phase 2: MatchManager & Match Modifications
1. **Match Reconnection Logic**: 
   - Modify `Match::add_player(player_id)`: If the `player_id` matches `alpha_player_id_` or `beta_player_id_`, return their existing side (reconnection successful).
2. **Disconnection Logic**:
   - In `MatchManager::remove_player`, *do not* call `match->remove_player()` if it's just a socket disconnect. The player remains in the match conceptually.
   - We only remove the player from the match entirely on `ABORT_MATCH` or `LEAVE_MATCH`.
3. **Room Passwords**:
   - Move the 4-digit code into the `Match` object (`std::string code_`).
   - Modify `JOIN_MATCH` payload to include both `session_id` and `code`.
   - Reconnecting players don't need the code. New opponents must provide the correct code matching `Match::code_`.

### Phase 3: Frontend Routing & UI
1. **URL Path Routing**:
   - Use React Router or simple path parsing in `App` to read `/match/<session_id>-<code>`.
2. **Reconnection Flow**:
   - If `App` loads with a `session_id` and `code` in the URL:
     - Connect WebSocket.
     - Send `AUTHENTICATE`.
     - Send `JOIN_MATCH { session_id, code }`.
     - If the backend says "Reconnected", transition straight to the `playing` phase.
     - If the backend says "Not in match" (and a 2nd player spot is open), attempt to join as the opponent using the `code`.
3. **UI Updates (Deployment Hub)**:
   - When a match is created, display the URL (`window.location.origin + /match/...`) so the player can copy it.
   - If a player joins via a URL, the frontend handles the frequency entry automatically via the URL parameter.

---

## 4. Connection Monitoring (Real-time Status)

To ensure players are aware of the network state of their opponent, the system uses the following real-time events:

### 4.1 Server Events
- `OPPONENT_DISCONNECTED`: Broadcast to a player when their opponent's WebSocket connection is lost.
- `OPPONENT_RECONNECTED`: Broadcast when the opponent successfully reconnects via a new WebSocket using their persistent `player_token`.

### 4.2 Frontend Overlay
In `PhaserGame.tsx`, a persistent "SIGNAL LOST" overlay appears when an `OPPONENT_DISCONNECTED` event is received. This overlay is automatically cleared upon `OPPONENT_RECONNECTED` or any other valid state update that indicates the opponent is active.

---

## 3. Verification Plan
- **Test 1:** Start a game, copy the URL. Refresh the page. Expected: Immediately back in the game, same state, no prompt.
- **Test 2:** Open a second browser (incognito). Paste the URL. Expected: Prompts for the 4-digit code.
- **Test 3:** Enter the wrong 4-digit code in the second browser. Expected: Error message "Invalid frequency".
- **Test 4:** Enter the correct 4-digit code. Expected: Game starts for both players.
- **Test 5:** Player 1 refreshes mid-game. Expected: Reconnects successfully and sees the current turn state accurately.
