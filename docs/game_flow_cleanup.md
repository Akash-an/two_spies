# Two Spies — Game Stop & State Cleanup

This document covers all match termination flows, how state is cleared at each layer, known bugs, and a concrete implementation plan to overhaul the cleanup system.

---

## 1. Backend Termination Flows

### 1.1 Abort Match (`ABORT_MATCH`)

**Trigger:** Player clicks "Abandon" in the hub or "Abort" in-game.

**Path:** `Session::on_message` → `MatchManager::abort_match(player_id)`

1. `MatchManager` looks up the `Match` via `player_to_session_`.
2. The room code is erased from `code_to_session_` — new joiners are blocked.
3. `Match::handle_abort(player_id)` is called:
   - `GameState::abort(side)` marks the state as game-over.
   - `GAME_OVER` is sent to both players.
   - `broadcast_state()` fires a final state update.
4. If the match was empty or not yet started, it is erased from `matches_` immediately.
5. **If the match was in progress, it stays in `matches_` until lazy cleanup** (see Bug 3.1).
6. The aborting player is removed from `player_to_session_`, freeing them to create a new match.
7. **The opponent's entry in `player_to_session_` is NOT removed** (see Bug 3.2).

### 1.2 Natural Game Over

**Trigger:** A strike lands on the opponent's city, or another win condition fires inside `GameState`.

**Path:** `Match::handle_action` → `GameState::strike/move/...` → result.game_over == true

1. `handle_action` constructs a `GAME_OVER` message and sends it to both players.
2. `broadcast_state()` fires a final filtered state.
3. The `Match` object **stays in `matches_`** in a game-over state (lazy cleanup).
4. Neither player is removed from `player_to_session_` at this point (see Bug 3.2).
5. The room code may already have been consumed by the second player joining (erased from `code_to_session_`), so no orphan code here.

### 1.3 Forfeit via Disconnect Timeout

**Trigger:** `WebSocketServer` periodic timer → `MatchManager::check_all_timeouts()` (every 1 second).

**Path:** `WebSocketServer::on_timeout_check` → `MatchManager::check_all_timeouts` → `Match::check_for_timeout`

1. `check_for_timeout` first calls `check_disconnect_timeouts()`.
2. If a player has been disconnected (`alpha/beta_disconnected_ = true`) for ≥ 60 seconds (`DISCONNECT_TIMEOUT_MS`), `GameState::forfeit(forfeiter, reason)` fires.
3. `GAME_OVER` is sent to both players.
4. `broadcast_state()` fires.
5. The `Match` stays in memory (lazy cleanup).

**Edge case:** If **both** players disconnect simultaneously, `ALPHA` forfeits (hard-coded fallback, line 618 of Match.cpp).

### 1.4 Forfeit via Turn Timeout

**Trigger:** Same periodic timer or any incoming message from a player (eager check in `Session::on_message` line 102).

**Path:** `Match::check_turn_timeout` → `Match::handle_turn_timeout`

1. Remaining actions for the expired player are set to 0.
2. `GameState::end_turn(expired_player, true)` skips the exploration bonus.
3. `TURN_CHANGE` is broadcast to both players.
4. `broadcast_state()` fires.
5. `alpha/beta_consecutive_timeouts_` is incremented.
6. If ≥ 3 consecutive timeouts (`MAX_CONSECUTIVE_TIMEOUTS`), `GameState::forfeit` fires and `GAME_OVER` is sent.

### 1.5 Client Disconnect (WebSocket Drop)

**Trigger:** Browser closes / network drops.

**Path:** `Session::on_read` (error) → `Session::close` → `WebSocketServer::unregister_session` → `MatchManager::remove_player`

1. `unregister_session` erases the session from `sessions_` (WebSocket map).
2. `MatchManager::remove_player` is called **without** holding `sessions_mutex_` (to avoid lock-order inversion deadlock documented in WebSocketServer.cpp line 63).
3. `remove_player` calls `Match::handle_player_disconnect(player_id)`:
   - Sets `alpha/beta_disconnected_ = true` and records disconnect time.
   - Sends `OPPONENT_DISCONNECTED` to the other player.
4. The player's entry in `player_to_session_` is **preserved** to allow reconnection.
5. The 60-second forfeit clock begins.

### 1.6 `LEAVE_MATCH` Message

**Trigger:** Frontend sends `LEAVE_MATCH` when the user clicks "Return to Lobby" after seeing the Game Over screen.

**Path:** `Session::on_message` → `MatchManager::remove_player(player_id)`

1. `remove_player` calls `Match::handle_player_disconnect` — treating a voluntary leave the same as a drop.
2. The disconnect timer starts, which can incorrectly trigger a forfeit GAME_OVER for the departing player's opponent in an already-finished game (see Bug 3.3).

---

## 2. Frontend State Cleanup Flows

Frontend state lives in the `App` component in `main.tsx`. The key pieces are:

| State Variable | Purpose |
|---|---|
| `phase` | Controls which screen is shown |
| `matchSessionId` / `matchSessionIdRef` | Active session guard for incoming messages |
| `matchCode` | Displayed room code |
| `initialMap` / `initialState` | Seeded data passed to `PhaserGame` |
| `playerSide` | Assigned side (ALPHA/BETA) |
| `urlCode` | Code parsed from the URL on load |
| `hasAutoJoined` | Ref to prevent double auto-join |

### 2.1 Hub Abandonment

**Trigger:** "Abandon" button in `MissionDeploymentHub` while waiting for an opponent.

**Handler:** `handleAbortMatch()` in `App`

1. Sends `ABORT_MATCH` over WebSocket.
2. Resets: `phase → 'deployment'`, `initialMap/State → null`, `matchCode/SessionId → null`, `playerSide → null`, `urlCode → null`, `hasAutoJoined → false`.
3. Clears `matchSessionIdRef.current`.
4. Pushes `/` to browser history.
5. Sets friendly log messages.

**Note:** `joinError` is **not cleared** here (see Bug 3.5).

### 2.2 In-Game Abort

**Trigger:** "Abort" button (power icon) in `PhaserGame` action bar (`onTerminateLink` prop).

**Handler:** Same `handleAbortMatch()` in `App`.

Same steps as 2.1. The `PhaserGame` component unmounts when `phase` changes away from `'playing'`.

### 2.3 Natural Game End (GAME_OVER → Return to Lobby)

**Trigger:** `GAME_OVER` received by `PhaserGame`, user clicks "Return to Lobby".

**Handler:** `onGameEnd` prop in `App`

1. Sends `LEAVE_MATCH` over WebSocket.
2. Resets: `phase → 'deployment'`, `matchCode/SessionId → null`, `playerSide → null`, `initialMap/State → null`.
3. Pushes `/` to browser history.
4. **`logs` is NOT reset**, so old tactical log messages may bleed into the Deployment Hub (see Bug 3.6).

### 2.4 Identity Termination ("Terminate Link")

**Trigger:** Button in `MissionDeploymentHub` that fully logs the operative out.

**Handler:** Inline `onTerminateLink` in `App`

1. Sends `ABORT_MATCH`.
2. Clears `localStorage` for `two_spies_name` and `two_spies_token`.
3. Resets `playerName`, all match state, logs.
4. Sets `phase → 'entering-name'`.
5. **Does not generate a new token** — on next connection the old (now-cleared) token is gone, so `WebSocketClient` will generate a fresh UUID (correct behavior).

### 2.5 WebSocket Reconnection Flow

**Trigger:** `WebSocketClient.connect()` is called after a drop, or on initial load when a match URL is in the address bar.

1. On connect, `AUTHENTICATE` is sent immediately with stored token + name.
2. Server responds with `AUTHENTICATED { in_match: bool }`.
3. If `in_match == true`, `App` stays in `'reconnecting'` phase and waits for `MATCH_START` + `MATCH_STATE`.
4. A 5-second safety fallback (`setTimeout`) drops back to `'deployment'` if no state arrives.
5. `matchSessionIdRef` is updated from the arriving `MATCH_STATE` message.

---

## 3. Known Bugs & Issues

### Bug 3.1 — Backend Memory Leak (Lazy Match Cleanup)

**Severity:** High — will grow unbounded in production

**Location:** `MatchManager::matches_`, `MatchManager::abort_match`, `Match::handle_action`

**Description:** Matches are never proactively evicted. The only cleanup path is when a player who was in that match later calls `create_match` or `join_match_by_code`. If both players leave and never return, the `Match` object (including its `GameState`, `CityGraph`, all message history, and the `SendFn` closure holding a `weak_ptr` to `WebSocketServer`) lives forever.

**Also affects:** `code_to_session_` — in natural game-over, the room code was already consumed (erased) when the second player joined, so the code slot is freed. However, `matches_` and `player_to_session_` entries remain.

### Bug 3.2 — Opponent Not Unlinked After Abort

**Severity:** Medium

**Location:** `MatchManager::abort_match` (line 201)

**Description:** `abort_match` only erases the *aborting* player from `player_to_session_`. The opponent remains linked to a dead match (`is_game_over() == true`). When the opponent later calls `create_match`, the stale entry is cleaned up by the "Match is over — clean up before creating new one" guard (lines 26–37). But if the opponent calls `join_match_by_code` with a *different* code, they hit `return old_session_id` at line 98 (the same-room-rejoining guard), which is the wrong path.

### Bug 3.3 — LEAVE_MATCH Treated as Disconnect

**Severity:** Low-Medium

**Location:** `Session::on_message` case `LEAVE_MATCH`, `MatchManager::remove_player`

**Description:** `remove_player` calls `handle_player_disconnect`, which sets the disconnected flag and starts the 60-second forfeit clock. For a match that is already game-over, this is harmless. But if a player sends `LEAVE_MATCH` mid-game (e.g., due to a UI bug), the opponent will receive `OPPONENT_DISCONNECTED` and later a spurious `GAME_OVER` after 60 seconds — even though the game may have been over.

### Bug 3.4 — Stale Message Race on Abort → Rejoin

**Severity:** Medium

**Location:** `App` `MATCH_STATE` handler (main.tsx line 233)

**Description:** When a player aborts and immediately creates a new match, `matchSessionIdRef` is cleared to `null`. The guard at line 240 allows stray `MATCH_STATE` messages through if `!currentId` and the phase is loading. A delayed delivery from the server for the old match can briefly overwrite `initialState`, causing the new game to start with the wrong state payload.

### Bug 3.5 — `joinError` Not Cleared on Abort

**Severity:** Low (cosmetic)

**Location:** `handleAbortMatch()` in main.tsx

**Description:** After aborting, `joinError` state is not reset. If a player previously had a "Room is full" error and then aborts their own match, the error may still display in the Deployment Hub.

### Bug 3.6 — Tactical Logs Persist After Game End

**Severity:** Low (cosmetic)

**Location:** `onGameEnd` handler in main.tsx

**Description:** The `logs` state array (used in the Deployment Hub terminal feed) is not reset when a game ends naturally. Tactical-game-specific messages like "City destroyed: Vienna" or "Intel claimed!" will appear in the deployment hub logs on return.

### Bug 3.7 — Room Code Pool Exhaustion Risk

**Severity:** Low (but operational risk at scale)

**Location:** `MatchManager::generate_room_code`

**Description:** The code pool is 1000–9999 (9000 codes). `generate_room_code` spins in a do-while loop until a unique code is found. If many stale matches pile up in `matches_` (due to Bug 3.1), their codes have already been consumed by the time the second player joined, so they aren't in `code_to_session_` anymore. The immediate exhaustion risk is low, but the spin-loop has no upper bound — it will loop forever if all 9000 slots are occupied.

### Bug 3.8 — No Frontend WebSocket Reconnection Logic

**Severity:** High (UX)

**Location:** `WebSocketClient.ts`, `App` `disconnected` handler

**Description:** When the WebSocket drops mid-game, the frontend emits `'disconnected'` but makes no attempt to reconnect. `isConnected` becomes false but `phase` stays `'playing'`, leaving the player on the game screen with a dead connection and no recourse except a full page reload.

---

## 4. Implementation Plan — Cleanup System Overhaul

### Overview

The overhaul has three pillars:

1. **Backend: Proactive GC** — Replace lazy cleanup with a time-based garbage collector that runs on the existing 1-second timer.
2. **Backend: Clean Separation of Disconnect vs. Leave** — Fix `LEAVE_MATCH` to not trigger a forfeit clock.
3. **Frontend: WebSocket Auto-Reconnect + Session Guard** — Add exponential backoff reconnection and harden state clearing.

---

### Phase A — Backend: Proactive Match GC

**Goal:** Eliminate the memory leak (Bug 3.1) and code pool exhaustion risk (Bug 3.8).

#### A1. Add a `finished_at_` timestamp to `Match`

In `Match.hpp`, add:

```cpp
// Set when the match transitions to game-over
std::optional<std::chrono::steady_clock::time_point> finished_at_;
```

In `Match.cpp`, set it in every terminal path:
- `handle_abort` (after `state_->abort(...)`)
- `handle_action` when `result.game_over`
- `handle_turn_timeout` when the forfeit fires
- `check_disconnect_timeouts` when forfeit fires

Expose a helper:
```cpp
bool is_expired(std::chrono::seconds ttl) const;
// Returns true if game is over AND finished_at_ was > ttl ago
```

#### A2. Add `purge_expired_matches()` to `MatchManager`

```cpp
// MatchManager.hpp
void purge_expired_matches(std::chrono::seconds ttl = std::chrono::seconds(300));
```

```cpp
// MatchManager.cpp
void MatchManager::purge_expired_matches(std::chrono::seconds ttl) {
    std::lock_guard lock(mutex_);
    for (auto it = matches_.begin(); it != matches_.end(); ) {
        auto& match = it->second;
        if (match->is_expired(ttl)) {
            // Remove player links
            auto& alpha = match->alpha_player_id(); // expose as const ref
            auto& beta  = match->beta_player_id();
            player_to_session_.erase(alpha);
            player_to_session_.erase(beta);
            // Room code already consumed at join time, skip code_to_session_
            it = matches_.erase(it);
        } else {
            ++it;
        }
    }
}
```

#### A3. Call `purge_expired_matches()` from `check_all_timeouts`

```cpp
void MatchManager::check_all_timeouts() {
    std::lock_guard lock(mutex_);
    for (auto& [session_id, match] : matches_) {
        if (match && match->is_started() && !match->is_game_over()) {
            match->check_for_timeout();
        }
    }
    // GC: remove matches that finished more than 5 minutes ago
    purge_expired_matches(std::chrono::seconds(300));
}
```

> **Note:** Keep the TTL generous (5 minutes) so players returning to the lobby can still see their result if they were slow to click "Return to Lobby".

---

### Phase B — Backend: Fix Player Unlinking

**Goal:** Fix Bug 3.2 (opponent not unlinked) and Bug 3.3 (LEAVE_MATCH treated as disconnect).

#### B1. Unlink both players in `abort_match`

```cpp
// After match->handle_abort(player_id):
// Remove the aborting player immediately
player_to_session_.erase(it);

// Also remove the opponent if the match is now over
// (their link is stale — they got GAME_OVER and should be free to create a new match)
auto& alpha = match->alpha_player_id();
auto& beta  = match->beta_player_id();
player_to_session_.erase(alpha);
player_to_session_.erase(beta);
```

This is safe because the `Match` object still lives in `matches_` for the GC TTL, but neither player is linked to it anymore.

#### B2. Add a `leave_match` method distinct from `remove_player`

```cpp
// MatchManager.hpp
void leave_match(const std::string& player_id);
```

```cpp
// MatchManager.cpp
void MatchManager::leave_match(const std::string& player_id) {
    std::lock_guard lock(mutex_);
    auto it = player_to_session_.find(player_id);
    if (it == player_to_session_.end()) return;

    auto mit = matches_.find(it->second);
    if (mit != matches_.end()) {
        auto& match = mit->second;
        if (match->is_game_over()) {
            // Graceful leave from a finished game — just unlink, no forfeit clock
            player_to_session_.erase(it);
        } else {
            // Mid-game leave — treat as disconnect so timeout logic applies
            match->handle_player_disconnect(player_id);
        }
    } else {
        player_to_session_.erase(it);
    }
}
```

Wire it up in `Session::on_message`:

```cpp
case protocol::ClientMsgType::LEAVE_MATCH:
    server_->match_manager().leave_match(player_id_);
    break;
```

---

### Phase C — Frontend: WebSocket Auto-Reconnect

**Goal:** Fix Bug 3.9. When the WebSocket drops mid-game, automatically attempt to re-establish the connection using exponential backoff.

#### C1. Add reconnect logic to `WebSocketClient`

```typescript
// WebSocketClient.ts additions
private reconnectAttempts = 0;
private maxReconnectAttempts = 8;
private reconnectDelay = 500; // ms, doubles each attempt
private shouldReconnect = false;

connect(): Promise<void> {
  this.shouldReconnect = true;
  return this._connect();
}

private async _connect(): Promise<void> {
  // ... existing connect logic ...
  this.ws.onclose = () => {
    this.emit('disconnected');
    if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
      this.reconnectAttempts++;
      console.info(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this._connect(), delay);
    } else {
      this.emit('reconnect_failed');
    }
  };
  this.ws.onopen = () => {
    this.reconnectAttempts = 0; // Reset on success
    // ... rest of existing onopen ...
  };
}

disconnect(): void {
  this.shouldReconnect = false; // Prevent auto-reconnect on explicit close
  this.ws?.close();
  this.ws = null;
}
```

#### C2. Show reconnection state in `App`

Add a `'reconnecting-ws'` sub-phase or a global banner. The `disconnected` event in `App` should not reset match state — it should show a "Reconnecting..." overlay on top of the game screen while the socket tries to restore.

---

### Phase D — Frontend: State Cleanup Hardening

**Goal:** Fix Bugs 3.4, 3.5, 3.6.

#### D1. Clear `joinError` in `handleAbortMatch`

```typescript
const handleAbortMatch = () => {
  // ... existing resets ...
  setJoinError(null); // Fix Bug 3.5
};
```

#### D2. Reset `logs` in `onGameEnd`

```typescript
onGameEnd={() => {
  // ... existing resets ...
  setLogs(['MISSION COMPLETE', 'RETURNING TO HUB...']); // Fix Bug 3.6
}}
```

#### D3. Harden the stale-message guard (Bug 3.4)

Set `matchSessionIdRef.current` to a sentinel value like `'__clearing__'` immediately when aborting, before the async state update settles. Any arriving message that sees `'__clearing__'` is dropped:

```typescript
const handleAbortMatch = () => {
  matchSessionIdRef.current = '__clearing__';  // Immediate guard
  // ... rest of resets ...
};
```

In the `MATCH_STATE` handler:
```typescript
const currentId = matchSessionIdRef.current;
if (currentId === '__clearing__' || (currentId && msgSessionId !== currentId)) {
  console.log('[App] Dropping stale MATCH_STATE');
  return;
}
```

---

---

### Phase E — Backend: Bound the Code Generator

**Goal:** Fix Bug 3.8. Prevent an infinite loop if the code pool is exhausted.

```cpp
std::string MatchManager::generate_room_code() {
    static std::mt19937 rng{std::random_device{}()};
    std::uniform_int_distribution<int> dist(1000, 9999);
    
    const int MAX_ATTEMPTS = 9000;
    for (int i = 0; i < MAX_ATTEMPTS; ++i) {
        std::string code = std::to_string(dist(rng));
        if (code_to_session_.count(code) == 0) return code;
    }
    // Fallback: expand to 6-digit codes if 4-digit pool is full
    std::uniform_int_distribution<int> wide(100000, 999999);
    return std::to_string(wide(rng));
}
```

---

### Execution Order

| Phase | Complexity | Impact | Do First? |
|---|---|---|---|
| D1/D2/D3 | Low | Fixes cosmetic + race bugs | ✅ Yes |
| B2 | Low | Fixes LEAVE_MATCH mis-routing | ✅ Yes |
| B1 | Low | Fixes opponent not unlinking | ✅ Yes |
| A1–A3 | Medium | Eliminates memory leak | ✅ Yes |
| E | Low | Prevents infinite loop | ✅ Yes |
| C1–C2 | Medium | Major UX improvement | After the above |
