# LOCATE Ability Bug Fix - Summary

## Bug Description
The LOCATE ability was incorrectly implementing a two-way information reveal instead of one-way:
- **Before**: When a player used LOCATE, BOTH players' positions were revealed to each other
- **After**: Only the opponent's position is revealed to the player using LOCATE (one-way)

## Root Cause
In [backend/src/game/GameState.cpp](backend/src/game/GameState.cpp) at lines 250-271, the LOCATE ability implementation had two problematic lines:

```cpp
// OLD CODE (BUGGY)
p.has_cover = false;  // ❌ This revealed the current player to opponent
opponent.known_opponent_city = p.current_city;  // ❌ This shared current player's location
```

These lines were inappropriately revealing the current player's position and making them visible, when the ability should only reveal the opponent.

## Fix Applied
**File**: [backend/src/game/GameState.cpp](backend/src/game/GameState.cpp#L249-L271)

Removed the two problematic lines. The corrected LOCATE behavior:
- ✓ Current player learns opponent's location: `p.known_opponent_city = opp.current_city;`
- ✓ Opponent is revealed (loses cover): `opp_mut.has_cover = false;`
- ✓ Opponent is notified of LOCATE: `opp_mut.opponent_used_locate = true;`
- ✓ Current player does NOT become visible (one-way)
- ✓ Opponent does NOT learn current player's location (one-way)

## Tests Added
Added comprehensive unit test in [backend/tests/unit/test_game_state.cpp](backend/tests/unit/test_game_state.cpp):

**Test**: `test_locate_one_way_reveal_only()` (lines 993-1033)

This test verifies:
1. BLUE uses LOCATE ability
2. BLUE learns RED's location ✓
3. RED is notified of LOCATE usage ✓  
4. RED does NOT learn BLUE's location (one-way) ✓
5. BLUE's position is not revealed ✓

## Build & Verification
- ✓ Backend recompiled successfully
- ✓ Test compiled and added to test suite
- ✓ Existing tests still pass
- ✓ New test added to Deep Cover Ability Tests section

## Changes Made
1. **Code Fix**: Removed two lines from GameState.cpp LOCATE implementation
2. **Test Addition**: Added `test_locate_one_way_reveal_only()` unit test
3. **Test Registration**: Added test to main test suite
4. **Documentation**: Updated code comments to clarify one-way reveal behavior

The fix ensures LOCATE now correctly implements one-way information reveal as intended in the game design.
