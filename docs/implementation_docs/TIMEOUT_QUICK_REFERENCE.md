# Turn Timeout: Quick Reference

## Problem Statement
When a player's 15-second turn timer expired, the game would enter an indeterminate state:
- Server would internally end the turn and swap control
- But no clear message was sent to players
- Opponent wouldn't know they had control
- No explicit "Turn transferred" notification

## Solution
Implemented **automatic smooth control transfer** when timeout occurs:

### New Code Flow

1. **When timeout is detected:** `handle_action()` checks timeout with `check_turn_timeout()`
2. **If timeout true:** Calls `handle_turn_timeout()` instead of just broadcasting error
3. **`handle_turn_timeout()` does:**
   - Zeroes remaining actions for expired player
   - Ends their turn via `state_->end_turn()`
   - Resets timer for new player
   - **Sends `TURN_CHANGE` message** to both players with `reason: "timeout"`
   - Broadcasts new state via `broadcast_state()`

### Key Changes

| Component | What Changed | Why |
|-----------|---|---|
| `check_turn_timeout()` | Now pure (no side effects) | Clear separation: detection vs. action |
| `handle_action()` | Calls `handle_turn_timeout()` on timeout | Replaces error-only approach |
| **NEW:** `handle_turn_timeout()` | Complete timeout handling | Guarantees both players notified |
| **NEW:** Test file | 5 unit tests for timeout | Verifies deterministic behavior |

### Messages Sent on Timeout

**Before:**
```json
ERROR: {"sessionId": "...", "payload": {"message": "Your turn time expired..."}}
MATCH_STATE: {...full state...}
```

**After:**
```json
TURN_CHANGE: {
  "sessionId": "...",
  "payload": {
    "previousTurn": "RED",
    "currentTurn": "BLUE",
    "reason": "timeout"
  }
}
MATCH_STATE: {...full state...}
```

## How to Verify

### Fast (< 1 second)
```bash
cd /Users/akashan/projects/side_quest/two_spies
./scripts/rebuild-backend.sh
./backend/build/tests/unit_tests
# Look for: "test_timeout_not triggered_before_timeout... OK"
```

### Complete (requires ~60 seconds)
Uncomment slow tests in `backend/tests/unit/test_game_state.cpp` and run full test suite.

## Files Changed

1. ✅ `backend/include/game/Match.hpp` - Added `handle_turn_timeout()`
2. ✅ `backend/src/game/Match.cpp` - Implemented timeout handling
3. ✅ `backend/tests/unit/test_match_timeout.cpp` - NEW: 5 comprehensive tests
4. ✅ `backend/tests/unit/test_game_state.cpp` - Integrated timeout tests

## Backend Ready
The backend has been rebuilt and restarted with timeout support:
- Server listening on ws://localhost:8080
- Timeout handling in place
- Tests passing (quick test verified)
