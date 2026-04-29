# Two Spies — Game Mechanics

> Canonical implementation reference for all game rules. When adding features, cross-check with `docs/game_design/game_design_doc.md`.

---

## Overview

Two players — **RED** and **BLUE** — are each placed on a different city on a global spy network map. They take turns performing actions to locate and eliminate each other. The player who successfully strikes the opponent's city wins.

---

## Win Conditions

| Condition | Description |
|---|---|
| **Successful Strike** | A player strikes the exact city where the opponent is located |
| **Opponent Stranded** | Opponent is in a city that disappears and cannot move to an adjacent non-disappeared city |

---

## Turn Structure

Each turn:
1. The active player has **2 actions**
2. The player may spend both actions, or use `END_TURN` to end early
3. After actions are exhausted (or `END_TURN` sent), the server calls `end_turn()`:
   - Awards **+4 base Intel**
   - Awards **+4 exploration bonus** if the player moved to a new (never-visited) city this turn
   - Clears all per-turn flags (`opponent_used_strike`, etc.)
   - Switches `currentTurn` to the other player
4. The server broadcasts `MATCH_STATE` and `TURN_CHANGE` to both clients

**Turn timer**: 30 seconds. On timeout, server auto-ends the turn and skips the exploration bonus.

---

## Actions

### MOVE
- **Cost**: 1 action
- **Target**: Any adjacent city (must be connected via an edge)
- **Effect**: Player teleports to the target city
- **Cover**: Grants `hasCover = true`
- **Adjacency check**: `CityGraph::are_adjacent(current, target)` must return `true`
- **Restriction**: Moving into an opponent-controlled city blows cover (`hasCover = false`), unless the player has `deep_cover_active`
- **Exploration**: If `target` is not in `visited_cities`, sets `moved_to_new_city_this_turn = true`

### STRIKE
- **Cost**: 1 action
- **Target**: Any city on the map
- **Effect**: If opponent is at `target_city`, game over — striker wins
- **Miss effect**: If opponent has `strike_report_unlocked`, they learn the striker's city
- **Cover**: Does NOT grant cover (position is revealed to Strike Report)
- **Stranded**: If the player is stranded (in a scheduled-to-disappear city), they can only MOVE

### WAIT
- **Cost**: 1 action
- **Target**: None (stays in current city)
- **Effect**: Grants `hasCover = true` if not in opponent-controlled city

### CONTROL
- **Cost**: 1 action
- **Target**: None (claims current city)
- **Effect**: Adds current city to `controlledCities[side]`
- **Visibility**: Reveals the player's position (removes cover)
- **Opponent restriction**: Opponent entering a controlled city has their cover blown (unless they have `deep_cover_active`)
- **Note**: Cannot control a city already controlled by the opponent

### END_TURN (manual)
- **Cost**: 0 actions (can be used any time during your turn)
- **Effect**: Triggers `end_turn()` immediately
- Skips remaining actions but still awards Intel normally

---

## Abilities

All abilities cost Intel and count as 1 action. Abilities are used via `PLAYER_ACTION` with `action: "ABILITY"`.

### LOCATE
| Property | Value |
|---|---|
| Cost | 10 Intel |
| Action cost | 1 action |
| Effect | Reveals opponent's `currentCity` → set in `knownOpponentCity` |
| Blocked by | Opponent's `deep_cover_active` |
| Duration | Revealed city persists in state until overwritten or turn ends |

If opponent has `deep_cover_active`, Locate fails and sets `locateBlockedByDeepCover = true` in sender's state.

### DEEP_COVER
| Property | Value |
|---|---|
| Cost | 20 Intel |
| Action cost | 1 action |
| Effect | Sets `deep_cover_active = true` for current turn + opponent's next turn |
| Blocks | LOCATE from revealing this player's city |
| Allows | Moving through opponent-controlled cities without cover loss |
| Restriction | Must be used as last action of turn |
| Restriction | Cannot use in opponent-controlled city |
| Expiry | Cleared at start of player's *next* turn (after opponent plays) |

Deep Cover lasts across the turn boundary: active during your remaining actions AND the opponent's entire next turn.

### STRIKE_REPORT
| Property | Value |
|---|---|
| Cost | 10 Intel |
| Action cost | 1 action |
| Effect | Permanently unlocks `strikeReportUnlocked` for the buyer |
| Trigger | Whenever opponent misses a strike, buyer learns opponent's current city |
| Duration | Permanent (rest of game) |
| One-time purchase | Cannot buy twice |

Strike Report is passive once unlocked. No activation needed — it auto-triggers on opponent misses.

### ENCRYPTION
| Property | Value |
|---|---|
| Cost | 25 Intel |
| Action cost | 1 action |
| Effect | Permanently unlocks `encryptionUnlocked` for the buyer |
| Hides | All opponent notification flags (`opponentUsedStrike`, `opponentUsedLocate`, `opponentUsedDeepCover`, `opponentUsedControl`, `opponentClaimedIntel`) |
| Duration | Permanent (rest of game) |
| One-time purchase | Cannot buy twice |

Encryption is passive once unlocked. The opponent's abilities still work normally, but the other player is no longer notified about them.

### RAPID_RECON
| Property | Value |
|---|---|
| Cost | 40 Intel |
| Action cost | 1 action |
| Effect | Permanently unlocks `rapidReconUnlocked` for the buyer |
| Trigger | When you enter a city where your opponent is, their cover is blown and you learn their position |
| Blocked by | Opponent's `deep_cover_active` |
| Duration | Permanent (rest of game) |
| One-time purchase | Cannot buy twice |

Rapid Recon is passive once unlocked. It auto-triggers on movement into the opponent's city.

### PREP_MISSION
| Property | Value |
|---|---|
| Cost | 40 Intel |
| Action cost | 1 action |
| Effect | Grants +1 action (total 3) on your next turn |
| Restriction | Must be used as last action of turn |
| Restriction | Cannot use in opponent-controlled city |
| Duration | Per-use (not permanent) |
| Activation | Sets `prepMissionActive = true`; consumed at start of next turn |

---

## Intel Economy

| Source | Amount | Condition |
|---|---|---|
| Starting Intel | 2 | Per player at match start |
| Base income | +4 | Every end-of-turn |
| Exploration bonus | +4 | First time visiting a city this turn |
| Intel marker pickup | +10 | Ending turn in a city that has an Intel marker; **reveals location** |
| Controlled city income | +4 per city | Per controlled city at end-of-turn |

**Ability costs** (deducted when used):
- LOCATE: -10
- DEEP_COVER: -20
- STRIKE_REPORT: -10
- ENCRYPTION: -25
- RAPID_RECON: -40
- PREP_MISSION: -40

Intel cannot go below 0. Actions requiring more Intel than available are rejected with an error.

---

## Intel Markers (Popups)

- The server periodically places Intel markers on cities (tracked in `intelPopups`)
- A player ending their turn in a city with a marker **claims +10 Intel** and the marker disappears
- Claiming Intel **reveals the player's location** to the opponent (`opponentClaimedIntel = true`)
- `claimedIntel` flag is set in the player's state for the turn the claim occurs

### Action Markers (Pickups)

- The server places Action markers on an independent spawn cycle from Intel markers (every 5–8 actions)
- Action markers appear on random cities (tracked in `actionPopups`)
- If a player ends their turn on a city with an Action marker, they gain **+1 action on their next turn**
- Claiming an Action marker **blows the player's cover** (`hasCover = false`)
- Action markers are distinct from Intel markers and spawn independently

---

## Shrinking Map

| Event | When |
|---|---|
| City scheduled to disappear | At action #4 of the server's global action counter (approximate cycle) |
| City disappears | At action #6 |

- `scheduledDisappearCity`: broadcast to both players as a warning
- `disappearedCities`: list of all permanently removed cities
- A disappeared city still exists in the map definition but is **non-traversable** and **unoccupiable**
- **Stranded state**: `isPlayerStranded = true` when the player's current city is scheduled to disappear. They may only use MOVE actions until they leave.
- If a player is stranded and all adjacent cities have disappeared, they lose

---

## City Control

- Any player can `CONTROL` their current city
- Once controlled, that city shows in `controlledCities: Record<string, PlayerSide>`
- Both players see all controlled cities
- Opponent **can enter** a controlled city, but their cover is blown (unless they have `deep_cover_active`)
- Control is permanent for the rest of the game (cities do not flip ownership)
- Controlled cities generate **+4 Intel per controlled city** at end of turn

---

## Cover Mechanics

`hasCover` is a flag on the player's state:

| Action | Cover effect |
|---|---|
| MOVE | Grants cover |
| MOVE into opponent-controlled city | Removes cover (unless `deep_cover_active`) |
| WAIT | Grants cover (if not in opponent-controlled city) |
| STRIKE | Does NOT grant cover |
| CONTROL | Removes cover (position revealed) |
| LOCATE (ability) | Does NOT affect own cover |
| Claiming Action pickup | Removes cover |

Cover affects whether the opponent's abilities can reveal your location in certain edge cases. It is also used by some UI indicators to show that a player is hidden.

---

## Game Map (Default — "Aegis Terminal")

14 cities connected by 23 edges. Coordinates are normalized (0.0–1.0) matching `plain-map.png`.

### Cities
| ID | Name | x | y |
|---|---|---|---|
| `nyc` | New York City | 0.300 | 0.320 |
| `havana` | Havana | 0.280 | 0.490 |
| `rio` | Rio de Janeiro | 0.395 | 0.650 |
| `london` | London | 0.500 | 0.280 |
| `algiers` | Algiers | 0.500 | 0.400 |
| `moscow` | Moscow | 0.600 | 0.250 |
| `dar_es_salaam` | Dar es Salaam | 0.625 | 0.620 |
| `tel-aviv` | Tel Aviv | 0.620 | 0.380 |
| `dubai` | Dubai | 0.670 | 0.440 |
| `bangalore` | Bangalore | 0.735 | 0.495 |
| `singapore` | Singapore | 0.807 | 0.555 |
| `beijing` | Beijing | 0.830 | 0.390 |
| `tokyo` | Tokyo | 0.910 | 0.400 |
| `sydney` | Sydney | 0.930 | 0.770 |

### Edges (Adjacency)
```
nyc ↔ havana
havana ↔ rio
nyc ↔ london
london ↔ algiers
algiers ↔ moscow
moscow ↔ beijing
beijing ↔ tokyo
tokyo ↔ sydney
sydney ↔ singapore
singapore ↔ bangalore
beijing ↔ dubai
dubai ↔ tel-aviv
tel-aviv ↔ dar_es_salaam
tel-aviv ↔ london
dar_es_salaam ↔ bangalore
singapore ↔ tokyo
dubai ↔ bangalore
nyc ↔ rio
rio ↔ dar_es_salaam
london ↔ moscow
nyc ↔ algiers
rio ↔ algiers
dar_es_salaam ↔ sydney
```

The map is defined in `backend/include/config/DefaultMap.hpp`. The frontend receives it via `MATCH_START.map` and renders it as an SVG with normalized coordinates scaled to the viewport.

---

## Per-Turn State Flags (Cleared Each Turn)

These flags are reset at the start of each player's turn to communicate what happened during the opponent's previous turn:

| Flag | Set when |
|---|---|
| `opponentUsedStrike` | Opponent performed a STRIKE action |
| `opponentUsedLocate` | Opponent used the LOCATE ability |
| `opponentUsedDeepCover` | Opponent used the DEEP_COVER ability |
| `opponentUsedControl` | Opponent used the CONTROL action |
| `opponentClaimedIntel` | Opponent claimed an Intel marker |
| `opponentUnlockedStrikeReport` | Opponent purchased STRIKE_REPORT this turn |
| `locateBlockedByDeepCover` | Own LOCATE attempt was blocked by opponent's Deep Cover |

> **Encryption**: If the opponent has `encryptionUnlocked`, all `opponent*` flags above are hidden (always sent as `false`). The abilities still work, but the other player is not notified.

---

## Starting Conditions

- Server picks 2 **distinct** random starting cities for the players
- Both players start with **2 Intel**
- Both players start with abilities: `[LOCATE, DEEP_COVER, STRIKE_REPORT, ENCRYPTION, RAPID_RECON, PREP_MISSION]`
- `currentTurn` is set to RED by default (configurable)
- Starting cities are shared with both players via `startingCity` / `opponentStartingCity` in state for UI reference, but actual opponent movement is hidden

