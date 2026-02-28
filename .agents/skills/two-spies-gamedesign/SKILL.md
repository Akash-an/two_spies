---
name: two-spies-gamedesign
description: Canonical reference for Two Spies game rules, mechanics, and design decisions. Use this skill whenever implementing or reasoning about game rules, turn structure, actions, movement, strike logic, Intel resource, abilities (Deep Cover, Encryption, Locate, Strike Report, Rapid Recon, Prep Mission), victory conditions, fog of war, hidden information, city graph, or cover system. Trigger: game rules, implement move, implement strike, add ability, turn logic, intel, cover, fog of war, city graph, win condition, validate action, GameState, game loop.
---

# Two Spies — Game Design Reference

The canonical Game Design Document (GDD) lives at:

**`docs/game_design/game_design_doc.md`**

Always read it before implementing or modifying any gameplay logic. Do not infer rules from context or prior knowledge — derive them from the GDD.

---

## When to consult the GDD

Consult `docs/game_design/game_design_doc.md` whenever you are working on:

| Task | Relevant GDD Section |
|---|---|
| Turn flow, action count, sequencing | §3 Turn Structure |
| Player movement, adjacency rules | §3 Turn Structure — Movement |
| Strike attempt and failure behaviour | §3 Turn Structure — Strike Action |
| Intel income calculation | §4 Resources |
| Any ability (Deep Cover, Locate, etc.) | §5 Abilities |
| Win/loss conditions | §6 Victory Conditions |
| Fog of war, state filtering per player | §7 Stealth and Fog of War |
| City graph, bonus cities, pickup cities | §2 Game World and Setup |
| Server-side state filtering rules | §11 Implementation Notes |
| UI layout, board design, action UX | §12 Visual Reference |

---

## Hard Rules (never deviate without updating the GDD first)

These constraints are fixed and must be enforced in code exactly as stated:

1. **Each turn = exactly 2 actions.** Actions may be: move, use ability, or strike.
2. **Starting cities are random and distinct.** Neither player's starting city is known to the opponent.
3. **Player positions are never sent to the opposing client.** The server filters state per player before broadcasting.
4. **A successful strike ends the round immediately.** No further actions are processed.
5. **A failed strike reveals the striker's city to the opponent.**
6. **Ending a turn in the same city as the opponent without cover is an immediate loss.**
7. **All action validation is server-side.** The client only sends intent; the server decides outcome.
8. **Map data (cities and edges) must not be hardcoded in GameState.** It must be loaded from external config.

---

## Abilities Quick Reference

| Ability | Intel Cost | Effect |
|---|---|---|
| Deep Cover | — | Reduces opponent's ability to track your location |
| Encryption | — | Hides what you spent Intel on from opponent deduction |
| Locate | — | Reveals clues about the opponent's possible city |
| Strike Report | — | Enhanced info after a strike attempt |
| Rapid Recon | — | Extra movement options or reveals potential paths |
| Prep Mission | — | Extra action or future positional setup |

> Exact costs and tuned values belong in a data config, not hardcoded in logic. See GDD §11.

---

## State Filtering Rule

The server must always produce **two separate state views** from a single `GameState`:

* `stateForPlayer(playerId)` — includes own position, own Intel, opponent's known/revealed info only.
* Never send full `GameState` directly to any client.

This is the core hidden-information invariant of the game.

---

## Updating the GDD

If a design decision changes during implementation:

1. Update `docs/game_design/game_design_doc.md` first.
2. Then update the code.
3. Never let code and GDD diverge silently.
