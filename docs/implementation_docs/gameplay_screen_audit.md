# Gameplay Screen Audit — `PhaserGame.tsx`

> Observations against: GDD (`docs/game_design/game_design_doc.md`), mockups (`docs/mockups/`), and the `ui-style` SKILL.

---

## Overview

The gameplay screen (`PhaserGame.tsx` + `PhaserGame.css`) is the **most incomplete screen** in the project. The pre-game screens (`CodenameAuthorizationTerminal`, `MissionDeploymentHub`) are well-built; the gameplay screen currently renders a functional but raw SVG map with a flat action bar and no visual polish matching the Cold War board-game aesthetic established in the mockups.

---

## 1. Map / Board

### 🔴 Critical Discrepancies

| # | Issue | GDD / Mockup Ref |
|---|-------|-----------------|
| 1 | **(UPDATED) Map background.** Originally planned as a Europe map, the project direction has shifted. The gameplay map should match the **global surveillance map** style from `surveillance-command-center-global-map.html`. | `surveillance-command-center-global-map.html` |
| 2 | **Spy markers are plain circles with a ★/✕ text glyph.** The mockups show **diamond-shaped spy pieces** (orange for player, green for opponent) which are iconic and essential to the game's identity. | `game_turn.jpg`, `game_start.jpg` |
| 3 | **No MOVE marker.** When in MOVE mode, the mockup shows the player piece's current location highlighted with dotted connections to reachable cities. The current implementation highlights *edges* going outward but does not visually indicate the player's position is "selected". | `game_turn.jpg` |
| 4 | **City nodes are small uniform circles.** The mockup uses slightly larger, clearly labelled city nodes with distinct styling — cities with Intel bonuses have a number badge (e.g. Belgrade `10`). The current SVG nodes have no badge/counter affordance. | `game_turn.jpg`, `game_start.jpg` |
| 5 | **Disappeared cities have no ✕ overlay.** The GDD says: *"The city is greyed out with a red X overlay."* Currently only CSS opacity is applied (`fill: #333; opacity: 0.3`) — no X mark is drawn. | GDD §4 Shrinking Map |
| 6 | **Scheduled-disappear city warning is a thin dashed ring.** The GDD says it should have a **"pulsing gold border"**. The dashed ring has no animation and does not pulse. | GDD §4 Shrinking Map |

### 🟡 Minor Issues

| # | Issue |
|---|-------|
| 7 | City label font size (10px SVG text) is too small and hard to read on the map at full viewport size. The mockup uses clearly legible city names next to each node. |
| 8 | The opponent's known city renders a red `✕` glyph inside the city circle — this collides visually with the `starting-opp` dashed ring and the `disappeared` state. Priority ordering of overlapping CSS classes is inconsistent. |
| 9 | Starting city indicators (`starting-own` / `starting-opp`) use a dashed stroke that is visually indistinguishable from the scheduled-disappear ring at a glance. Needs a distinct visual treatment. |
| 10 | Intel popup icon is a `$` dollar sign inside the city circle. The mockup suggests a distinct pickup indicator. A `$` is anachronistic for Cold War theme. |

---

## 2. Action Bar

### 🔴 Critical Discrepancies

| # | Issue | GDD / Mockup Ref |
|---|-------|-----------------|
| 11 | **No MOVE button.** The current action bar has: `MOVE`, `STRIKE`, `LOCATE`, `DEEP COVER`, `WAIT`, `CONTROL`, `END TURN`, `TERMINATE`. The mockup action strip has distinct **icon cards** for each action — not plain text buttons. There is no visual hierarchy or iconography. | `possible_actions.jpg` |
| 12 | **STRIKE mode requires clicking a city on the map.** The GDD (§3 Strike Action) says: *"Strike no longer requires city selection; it always targets current location."* But the current code sets `actionMode = 'STRIKE'` and then waits for a city click on the map. This is a functional bug — strike should fire immediately at current location. | GDD §3 Strike Action |
| 13 | **Ability buttons are never Intel-gated (disabled when insufficient Intel).** The GDD (§5) says: *"If a player has fewer Intel points than an ability requires, that ability button is disabled."* Currently `LOCATE` and `DEEP COVER` buttons are only disabled by `!canAct` — they do not check `matchState.player.intel`. | GDD §5 Resources |
| 14 | **LOCATE fires as an instant ability but doesn't require target selection.** This is correct per GDD, but there is no tooltip or feedback indicating *what* LOCATE does, and no animation/flash when the opponent is revealed on the map. | GDD §6 Abilities |
| 15 | **`Encryption`, `Strike Report`, `Rapid Recon`, `Prep Mission` abilities are missing from the action bar entirely.** While marked "TBD" in the GDD, they are listed in `AbilityId` enum and referenced in `player.abilities`. The bar should at minimum render them as locked/greyed slots so the UI layout is complete. | `possible_actions.jpg` (shows `UNLOCK` slots) |
| 16 | **Stranded player restriction not enforced in the UI.** The GDD says: when `isPlayerStranded`, only `MOVE` should be available; `Strike`, abilities, and `Wait` must be **disabled and greyed out**. Currently all buttons remain enabled and only a notification message is added. | GDD §4 Stranded Player |

### 🟡 Minor Issues

| # | Issue |
|---|-------|
| 17 | `END TURN` button can be clicked at any point during the player's turn, even before using both actions. There is no confirmation or visual nudge warning that actions remain. |
| 18 | The action bar uses Tailwind-free custom CSS while the rest of the project uses Tailwind. This is a style inconsistency noted in `ui-style` SKILL — Tailwind utilities should be preferred. |
| 19 | The `TERMINATE` button sits directly adjacent to `END TURN` with only a `margin-left` gap. Risk of accidental mis-clicks that exit the game entirely. Should have more visual separation or a confirmation dialog. |

---

## 3. Header / HUD

### 🔴 Critical Discrepancies

| # | Issue | GDD / Mockup Ref |
|---|-------|-----------------|
| 20 | **Actions remaining shown only in text in the header.** The mockup shows a **dedicated `ACTIONS` counter in the bottom-left with a lightning-bolt icon** (`⚡⚡` for 2 actions). This is a first-class HUD element, not just a text string. | `game_turn.jpg` bottom-left |
| 21 | **Intel shown only in the side panel**, not in the HUD. The mockup shows `INTEL 3` as a dedicated bottom-left HUD element alongside the actions counter. | `game_turn.jpg` bottom-left |
| 22 | **No TARGET panel.** The mockup shows a `TARGET` panel in the top-left with the opponent's spy icon and ability icons. This is completely absent from the current implementation. | `game_turn.jpg` top-left |

### 🟡 Minor Issues

| # | Issue |
|---|-------|
| 23 | Timer display (`{timerSeconds}s`) is a bare number. No progress bar or radial countdown to create urgency. |
| 24 | Player side label (`RED — OPERATIVE_X`) uses the raw `PlayerSide` value. The mockup doesn't show raw `RED`/`BLUE` text — it uses the spy piece colour as a visual differentiator, not a text label. |

---

## 4. Side Panel

### 🟡 Minor Issues

| # | Issue |
|---|-------|
| 25 | **`knownOpponentCity` displays the city ID, not the city name.** `matchState.player.knownOpponentCity` is an ID (e.g. `"berlin"`), not a display name. The panel should resolve the ID to a human-readable name via `matchState.map.cities`. |
| 26 | **Abilities section lists `AbilityId` enum strings** (e.g. `DEEP_COVER`) with underscores. It replaces only the first underscore (`replace('_', ' ')`). `STRIKE_REPORT` would render as `STRIKE REPORT` but `RAPID_RECON` → `RAPID RECON` (ok), while multi-underscore names are fine — but this is a brittle, partial fix. Should use `replaceAll`. |
| 27 | **No distinction between available and unavailable abilities in the abilities list.** Intel cost comparison is not shown. |
| 28 | The Intel Log (notification list) auto-scrolls from bottom but messages have no timestamps. In a slow turn-based game, context of *when* an event happened is important. |

---

## 5. Game Over Overlay

### 🔴 Critical Discrepancies

| # | Issue | GDD / Mockup Ref |
|---|-------|-----------------|
| 29 | **Game over screen is a minimal text card** (`MISSION SUCCESSFUL` / `MISSION FAILED`). The mockup `game_end.jpg` shows a rich end-of-round screen with: player character illustrations, a **star rating** (1–5 stars), **both player names and rank badges**, a **round score tracker** (bar indicators on the sides), and a countdown timer (`NEXT GAME IN... 0:03`). | `game_end.jpg` |
| 30 | **No round/series score tracking.** GDD §11 defines the mode as "best of 5". The current `GAME_OVER` payload only shows `winner` and `reason` — there is no round counter or match series state in the UI. | GDD §11 Game Modes |

---

## 6. Visual / Aesthetic (vs. ui-style SKILL)

### 🔴 Critical Discrepancies

| # | Issue |
|---|-------|
| 31 | **(RESOLVED) Map aesthetic.** The previously noted discrepancy about the neon cyberpunk space aesthetic being a "placeholder" is now **resolved by design change**. The gameplay screen SHOULD use the dark cyberpunk aesthetic matching the global map, not the vintage Cold War style. |
| 32 | **No scanline overlay** during gameplay. Other screens include this retro effect per the ui-style SKILL. |
| 33 | **Action buttons have no icons.** The `possible_actions.jpg` mockup shows distinctive hand-drawn icons for each action type (dagger for STRIKE, hourglass for WAIT, pin for LOCATE, etc.). Text-only buttons feel out of place. |

---

## 7. Functional Logic Gaps

| # | Issue | Source |
|---|-------|--------|
| 34 | **Turn timer desync**: `localTimerMs` ticks at 200ms intervals regardless of whose turn it is, and resets only when a new `MATCH_STATE` arrives. If state messages are delayed, the displayed timer will drift from the server's actual elapsed time. | `PhaserGame.tsx` L131–137 |
| 35 | **`TURN_CHANGE` message is defined in `ServerMessageType` but never listened to.** Only `MATCH_STATE` drives turn detection. If the server sends `TURN_CHANGE` independently, it is silently dropped. | `Messages.ts`, `PhaserGame.tsx` |
| 36 | **`playerSide` is captured in `App` but discarded** (`const [, setPlayerSide] = useState...`). `PhaserGame` derives `mySide` from `matchState.player.side` instead — which is correct, but `playerSide` state in App is dead code. | `main.tsx` L20 |
| 37 | **`handleCityClick` allows clicking the player's own city in STRIKE mode**, which per the GDD should immediately fire (since strike targets current location). Instead it does nothing useful — the click is accepted, `sendAction(STRIKE, cityId)` fires with the current city, which accidentally works but is semantically wrong. The strike button itself should fire immediately, no map click required. | GDD §3, `PhaserGame.tsx` L169–172 |

---

## Summary Priority Matrix

| Priority | Category | Count |
|----------|----------|-------|
| 🔴 Critical — broken mechanics or wrong behaviour | Action bar, Map visuals, Game over | 17 |
| 🟡 Important — missing features or aesthetic gaps | HUD, Panel, Side effects | 20 |
| Total discrepancies identified | | **37** |

---

## Suggested Fix Order

1. **Fix STRIKE action** — remove map-click requirement, fire immediately on button press (Bug #12)
2. **Intel-gate ability buttons** — disable LOCATE/DEEP COVER when Intel < cost (Bug #13)
3. **Enforce stranded restrictions** — disable non-MOVE buttons when `isPlayerStranded` (Bug #16)
4. **Fix knownOpponentCity display** — resolve ID → city name (Bug #25)
5. **Add disappeared city ✕ overlay** in SVG (Bug #5)
6. **Animate scheduled-disappear ring** — pulsing gold (Bug #6)
7. **Actions + Intel HUD** — add bottom-left counter elements (Bugs #20–21)
8. **Implement global map background** — use the dark cyberpunk world map aesthetic (Bug #1)
9. **Replace spy circles with diamond markers** (Bug #2)
10. **Enrich the game-over overlay** — scores, round tracker, countdown (Bugs #29–30)
