# Intel Increase Mechanics - Reference Document

**Last Updated:** March 22, 2026  
**Status:** ✅ Verified with Unit Tests  

---

## Overview

Players earn Intel each turn, which serves as the primary resource for purchasing abilities. The amount of Intel earned depends on whether the player moved to a new (previously unvisited) city during their turn.

---

## Intel Income Rules

### Base Income

Every player earns **4 Intel** at the end of each turn, regardless of actions taken.

- **Starting Intel:** 2 points
- **Base per-turn income:** +4 points

### Exploration Bonus

When a player **ends their turn in a city they have not previously visited**, they earn an additional **4 Intel**.

- **Bonus applies:** +4 Intel
- **Condition:** `start_city != end_city` AND `city not previously visited`
- **Timing:** Bonus is awarded at end of turn
- **Flag Reset:** The `moved_to_new_city_this_turn` flag resets after `end_turn()` is called

---

## Total Intel Per Turn

| Scenario | Base | Bonus | Total |
|----------|------|-------|-------|
| No movement | +4 | 0 | **+4** |
| Movement to previously visited city | +4 | 0 | **+4** |
| Movement to new (unvisited) city | +4 | +4 | **+8** |

---

## Examples

### Example 1: Single Turn Progression

```
Turn Start:    Intel = 2 (starting amount)
Action:        Move to Paris (adjacent city, new)
Action:        End Turn
Turn End:      Intel = 2 + 4 (base) + 4 (exploration) = 10
```

### Example 2: Multiple Turns

```
Turn 1:
  Start Intel: 2
  Action: Move to Paris (new city)
  End Turn: 2 + 4 + 4 = 10 Intel

Turn 2 (same player):
  Start Intel: 10
  Action: Move to Amsterdam (new city)
  End Turn: 10 + 4 + 4 = 18 Intel

Turn 3 (same player):
  Start Intel: 18
  Action: Stay in Amsterdam (visited)
  End Turn: 18 + 4 + 0 = 22 Intel

Turn 4 (same player):
  Start Intel: 22
  Action: Move back to Paris (visited)
  End Turn: 22 + 4 + 0 = 26 Intel
```

### Example 3: Exploration Pattern

```
Starting Intel: 2

Round 1: Move Paris (new)    → 2 + 4 + 4 = 10
Round 2: Move Berlin (new)   → 10 + 4 + 4 = 18
Round 3: Move Paris (visited)→ 18 + 4 + 0 = 22
Round 4: Move Vienna (new)   → 22 + 4 + 4 = 30
Round 5: Wait (no move)      → 30 + 4 + 0 = 34
```

---

## Implementation Details

### Backend (C++)

**File:** `/backend/src/game/GameState.cpp` (lines 418-425)

```cpp
// Intel income: base 4 per turn
int income = 4;
p.intel += income;

// Exploration bonus: +4 Intel if player moved to a new city this turn
if (p.moved_to_new_city_this_turn) {
    p.intel += 4;
    p.moved_to_new_city_this_turn = false;  // Reset flag for next turn
}
```

### Movement Tracking

The `moved_to_new_city_this_turn` flag is set when:
1. Player calls `move(PlayerSide, target_city)`
2. The `target_city` has NOT been visited before by this player
3. The flag is automatically reset at end of turn

---

## Unit Tests

✅ **All tests passing** (5/5)

### Test Coverage

| Test Name | Purpose |
|-----------|---------|
| `test_intel_base_increase_no_movement` | Verify +1 base without movement |
| `test_intel_with_new_city_movement` | Verify +5 total with new city |
| `test_intel_no_bonus_revisiting_city` | Verify no bonus for revisiting |
| `test_intel_moved_to_new_city_flag_resets` | Verify flag resets each turn |
| `test_intel_multiple_turns_accumulation` | Verify multi-turn progression |

**Run tests:**
```bash
./backend/build/tests/unit_tests
```

---

## Common Questions

### Q: Why do I see "+1" sometimes and "+5" other times?
**A:** 
- **+1** = You ended your turn in a city you've already visited (or didn't move)
- **+5** = You moved to and ended your turn in a city you've never been to before (1 base + 4 bonus)

### Q: Does starting city count toward explored cities?
**A:**
No. You begin the game in your starting city, but you don't "move" there. Starting cities do NOT grant the exploration bonus on the next endturn call because the flag is not set for starting positions.

### Q: Can I game the system by revisiting an old city?
**A:**
No. The exploration bonus is specifically for **new** cities. Once you've visited a city, revisiting it only grants the base +1 Intel, not the +4 bonus.

### Q: At what point does the bonus get applied?
**A:**
The bonus is applied when `end_turn()` is called. If you move to Paris in your first action, then strike in your second action, you **still** get the +4 bonus because the bonus is based on your ending position, not your actions.

---

## Future Enhancements

Potential variations to consider:
- Different exploration bonuses per difficulty level
- Diminishing returns for multiple cities in a row
- Region-based bonuses (e.g., +2 bonus for cities in dangerous regions)
- City-specific bonuses (e.g., capital cities grant +6 instead of +4)

---

## References

- **Game Design Document:** `/docs/game_design/game_design_doc.md` (Section 5: Resources)
- **Architecture:** `/docs/architecture.md`
- **Unit Tests:** `/backend/tests/unit/test_game_state.cpp` (Lines 151-276)

