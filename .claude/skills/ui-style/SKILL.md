---
name: ui-style
description: Visual design reference for Two Spies UI. Use this skill whenever implementing or restyling any Phaser scene, HUD element, button, banner, modal, or city node. Trigger: style, color, theme, art style, UI, button, HUD, banner, modal, map, city node, marker, parchment, vintage, action bar, lobby, game over screen, responsive layout, font, typography, visual, look and feel.
---

# Two Spies — UI Style Reference

Canonical visual design extracted from mockups at `docs/mockups/`.
Always consult these specs before implementing any visual element.

---

## 1. Art Direction

The game uses a **vintage Cold War board-game / illustrated atlas** aesthetic.

Key descriptors:
- Warm parchment and cream tones for land and UI panels
- Teal/seafoam watercolour for ocean/water areas
- Rust-brown hand-drawn lines for the city network
- Rubber-stamp typography for major headings
- Worn paper texture feel throughout
- Spy pieces styled as diamond/kite map pins (not circles)

**Do not** use the current dark space theme (`#0f0f23`, neon gold, monospace sci-fi). That theme is a placeholder. Refer to mockups, not existing code, for visual decisions.

---

## 2. Color Palette

| Token | Hex | Usage |
|---|---|---|
| `PARCHMENT_LIGHT` | `#f5f0d8` | Land areas, modal backgrounds, action bar |
| `PARCHMENT_MID` | `#e8dfc0` | Button faces, sidebar fill, panel backgrounds |
| `PARCHMENT_DARK` | `#c8a96e` | Panel borders, edge trim, shadow tones |
| `INK_DARK` | `#2a1a0a` | Primary text, city labels, HUD labels |
| `INK_MID` | `#5a3a1a` | Secondary text, icon strokes |
| `OCEAN_TEAL` | `#6db5ae` | Map background (water/sea) |
| `OCEAN_TEAL_DARK` | `#4a9a92` | Ocean shadow/depth areas |
| `MAP_EDGE` | `#7a4030` | Normal city-network edges (brown/rust) |
| `MAP_EDGE_ADJACENT` | `#cc3322` | Adjacent/reachable edges (dashed red) |
| `SPY_GREEN` | `#4db84e` | Player spy marker (green diamond) |
| `SPY_GREEN_DARK` | `#3a9a3a` | Spy marker border/shadow |
| `TARGET_RED` | `#cc3322` | Opponent target marker (red/orange diamond) |
| `TARGET_RED_DARK` | `#9a2010` | Target marker border |
| `PANEL_HEADER` | `#3d2010` | Left sidebar header background |
| `ACTIONS_RED` | `#c0392b` | Actions/Intel counter background (bottom-left HUD) |
| `BANNER_RED` | `#c0392b` | "Your Turn!" banner background |
| `BANNER_GREEN` | `#4db84e` | "Opponent's Turn" / neutral turn banner |
| `BUTTON_ACTIVE` | `#3d2010` | Active/selected action button (dark inverted) |
| `BUTTON_DISABLED` | `#b0a888` | Locked/greyed-out ability buttons |
| `STAR_ACTIVE` | `#e53030` | Filled star in end-game rating |
| `STAMP_BLUE` | `#2a5a8a` | "VICTORY" stamp text colour |
| `OVERLAY_DARK` | `rgba(20,10,5,0.65)` | Modal overlay scrim |

---

## 3. Typography

| Usage | Font | Size | Style | Colour |
|---|---|---|---|---|
| Screen title (LOBBY) | `'Georgia', serif` | 48 px | Bold, uppercase | `INK_DARK` |
| Stamp heading (VICTORY/DEFEAT) | `'Georgia', serif` | 56–72 px | Bold, uppercase, letter-spacing 4 px | `STAMP_BLUE` or `TARGET_RED` |
| Subheading / turn banner | `'Georgia', serif` | 24 px | Bold, italic | `#ffffff` |
| HUD label | `'Georgia', serif` | 13 px | Normal | `INK_DARK` |
| City label | `'Georgia', serif` | 11 px | Normal | `INK_DARK` |
| Counter value (actions/intel) | `'Georgia', serif` | 20 px | Bold | `#ffffff` |
| Button label | `'Georgia', serif` | 11 px | Small caps / uppercase | `INK_DARK` |
| Tooltip | `'Georgia', serif` | 11 px | Normal | `INK_MID` |
| Player name tag | `'Georgia', serif` | 14 px | Bold, uppercase | `INK_DARK` |
| Rank badge (SECRET, CLASSIFIED) | `'Georgia', serif` | 12 px | Bold, uppercase | `#ffffff` |

> **Note:** The current codebase uses `'monospace'` everywhere. Replace with `'Georgia', serif` or a Google Font import of `IM Fell English` / `Cinzel` when implementing the target style.

---

## 4. Map Background

The map is a stylised illustrated Europe:

- **Water/sea areas:** fill `OCEAN_TEAL` (`#6db5ae`), with slightly darker edges `OCEAN_TEAL_DARK`
- **Land areas:** fill `PARCHMENT_LIGHT` (`#f5f0d8`)
- No grid lines, no latitude/longitude
- Soft illustrated coastline silhouettes (not photographic)
- Subtle paper grain/noise texture overlay at ~10–15% opacity is ideal but optional

Implementation approach:
- Load a pre-rendered SVG/PNG of the Europe silhouette as the scene background image
- Place it to fill the canvas, centred

---

## 5. City Network (Graph Edges)

| State | Colour | Style | Thickness |
|---|---|---|---|
| Normal edge | `MAP_EDGE` (`#7a4030`) | Solid | 2 px |
| Adjacent/reachable edge | `MAP_EDGE_ADJACENT` (`#cc3322`) | Dashed (dash: 8, gap: 6) | 2 px |
| Non-reachable when move mode active | `MAP_EDGE` | Solid, alpha 0.35 | 1 px |

Phaser drawing: use `graphics.setLineDash([8, 6])` for dashed adjacent edges when in MOVE mode.

---

## 6. City Nodes

All nodes are **hollow circles** (stroke only) on the parchment map — not filled solid blobs.

| Type | Fill | Border | Radius | Label |
|---|---|---|---|---|
| Normal city | `PARCHMENT_LIGHT` / transparent | `INK_DARK` 1.5 px | 8 px | City name below in `INK_DARK` 11 px |
| Bonus city | `PARCHMENT_LIGHT` | `INK_DARK` 1.5 px + small number badge | 8 px | Name + badge |
| Pickup city | `PARCHMENT_LIGHT` | `INK_DARK` 1.5 px | 8 px | Name, or distinct dot fill |
| Current city (player) | — | `SPY_GREEN` 2.5 px | 10 px | Label in `SPY_GREEN` |
| Adjacent (in MOVE mode) | `#cc3322` semi-transparent fill 0.15 | `MAP_EDGE_ADJACENT` dashed | 10 px | Normal label |
| Known opponent city | — | `TARGET_RED` pulsing ring | 10 px | Label in `TARGET_RED` |

Bonus city badge: small circle (12 px diameter) containing a number, filled `PARCHMENT_DARK`, text `INK_DARK`, positioned to the upper-right of the node.

---

## 7. Player Markers

The mockup uses a **diamond kite / map-pin** shape, not a circle.

### Spy marker (player)
- Diamond kite shape (rotated square with pointed bottom, ~24 × 32 px)
- Fill: `SPY_GREEN` (`#4db84e`)
- Border: `SPY_GREEN_DARK` (`#3a9a3a`), 2 px
- Small icon or symbol inside (optional: lightning bolt or eye)
- Positioned at city centre, bottom point touching the node

### Target marker (opponent, when known)
- Same diamond kite shape
- Fill: `TARGET_RED` (`#cc3322`)
- Border: `TARGET_RED_DARK` (`#9a2010`), 2 px
- Pulse animation: alpha 1.0 → 0.5, 700 ms, yoyo, repeat -1

### Starting city rings
- Own start: `SPY_GREEN` dashed outer ring, label "YOUR START"
- Opponent start: `TARGET_RED` dashed outer ring, label "OPP START"

Implementation: Generate these as canvas textures in `BootScene.generatePlaceholderTextures()`. Replace `spy_marker` texture with a diamond kite drawn via Phaser Graphics path.

---

## 8. Left Sidebar (HUD Panel)

The left sidebar is a **vertical parchment panel** that sits flush to the left edge of the canvas.

```
┌──────────────┐
│  TARGET      │  ← dark header (`PANEL_HEADER`), player role label
│  ⚡ ⚡       │  ← action icons (lightning bolts), one per remaining action
│              │
│  [ACTIONS]   │  ← bottom block: red tile
│    ⚡ ⚡      │
│  [INTEL]     │
│    3         │
└──────────────┘
```

- Panel width: ~85 px
- Panel background: `PARCHMENT_MID` (`#e8dfc0`)
- Header background: `PANEL_HEADER` (`#3d2010`), text `#ffffff`, bold, uppercase 12 px
- Action icons: ⚡ bolt SVG or text, `INK_DARK`, 24 px each, greyed when spent
- Bottom counters: two separate dark-red tiles (`ACTIONS_RED` `#c0392b`), white bold text
  - "ACTIONS" label 10 px + value row
  - "INTEL" label 10 px + value row
- Thin right border: `PARCHMENT_DARK`, 1 px

---

## 9. Action Bar (Bottom HUD)

The action bar is a **horizontal strip at the bottom** of the canvas, styled as parchment cards.

Layout: centred row of icon-buttons.

Current buttons from mockup (left → right):
`CONTROL | STRIKE | WAIT | GO DEEP | LOCATE | PREP | UNLOCK | UNLOCK | UNLOCK`

### Button anatomy (each ~64 × 72 px):
```
┌──────────┐
│  [ICON]  │  ← SVG/texture icon, 32 × 32 px
│  LABEL   │  ← 10 px, uppercase, `INK_DARK`
└──────────┘
```

| Button state | Background | Border | Label colour | Icon tint |
|---|---|---|---|---|
| Normal | `PARCHMENT_MID` | `PARCHMENT_DARK` 1 px | `INK_DARK` | Normal |
| Hover | `PARCHMENT_DARK` | `INK_MID` 1.5 px | `INK_DARK` | Slight darken |
| Active/selected | `BUTTON_ACTIVE` `#3d2010` | `#2a1a0a` 2 px | `#ffffff` | White tint |
| Disabled/locked | `BUTTON_DISABLED` `#b0a888` | `#a09878` 1 px dashed | `#88806a` | Grey tint |

Rounded corners: 4 px radius.

The bar background: `PARCHMENT_LIGHT`, full canvas width, ~80 px tall, with a top border of `PARCHMENT_DARK` 1–2 px.

---

## 10. Turn Banner

A **banner overlay** shown centre-screen when a turn begins.

| Whose turn | Background | Text | Style |
|---|---|---|---|
| Your turn | `BANNER_RED` `#c0392b` | "Your Turn!" | Bold, italic, white, ~28 px |
| Opponent's turn | `BANNER_GREEN` `#4db84e` | "Target's Turn" | Bold, italic, white, ~28 px |

Banner characteristics:
- Width: ~360 px, height: ~56 px, rounded 6 px
- **Dotted/stamp texture** on the background: overlay a noise/dot pattern PNG at ~20% alpha
- Slides in from top (y: -80 → centreY), ease `Back.easeOut`, 300 ms
- Auto-dismisses after 2 s with fade-out
- Text centred

---

## 11. Notification Banners (Strike / Locate alerts)

Smaller banners shown just below the top HUD for in-game events.

- Width: ~400 px, height: ~56 px
- Background: `PARCHMENT_MID` 0.95 alpha
- Border: event-colour (red for strike, amber for locate), 2 px
- Two lines: bold event name + smaller detail
- Same slide-in animation as turn banner

---

## 12. Game Over Modal

A **centred modal** over a darkened overlay, styled as a thick parchment card.

```
┌────────────────────────────────────┐
│           VICTORY                  │  ← rubber-stamp heading
│  "A decisive win. Great work."     │  ← subtext, serif, 18 px
│                                    │
│   [RED SPY]  ★★☆☆☆  [GREEN SPY]  │  ← player markers + star rating
│                                    │
│  PLAYER_A        PLAYER_B          │  ← names
│  [SECRET **]     [CLASSIFIED >>]   │  ← rank badges
│                                    │
│  ▐▌ ■■ 0:03 ■■ ▌▐                 │  ← score bars + countdown
│         NEXT GAME IN…              │
└────────────────────────────────────┘
```

- Modal background: `PARCHMENT_LIGHT` `#f5f0d8`
- Modal border: `PARCHMENT_DARK` 3 px
- Outer overlay: `OVERLAY_DARK` rgba scrim
- "VICTORY" text: `STAMP_BLUE` `#2a5a8a`, bold, uppercase, letter-spacing, 64 px — like a rubber stamp
- "DEFEAT" text: `TARGET_RED` `#cc3322`, same treatment
- Rank badges: coloured pill (`PANEL_HEADER` bg), white text, bold, uppercase
- Countdown: dark digit display (like old LED), monospace or retro font
- Score bars: red vs grey horizontal bars flanking the timer

---

## 13. Lobby Scene

- Same map background (ocean + land)
- Title "TWO SPIES" centred, ~64 px, `INK_DARK`, bold serif
- Subtitle "a game of espionage" in italic, `INK_MID`, 16 px
- Player name input: parchment-styled input field, `PARCHMENT_MID` background, `INK_DARK` border, serif font
- "ENTER" / "JOIN" button: styled as an action bar button (see §9)
- Waiting state: "Waiting for opponent…" in italic, small, `INK_MID`

---

## 14. Loading / Boot Scene

- Background: `PARCHMENT_LIGHT` (not dark space)
- Title: same as lobby
- Progress bar: thin `PARCHMENT_DARK` track, `ACTIONS_RED` fill
- "Loading…" text: `INK_MID`, small serif

---

## 15. Applying the Style in Code

### Replace background colours
```typescript
// OLD (placeholder dark theme):
this.cameras.main.setBackgroundColor('#0f0f23');

// NEW (vintage map theme):
// Set ocean teal as canvas bg, then draw land silhouette on top
this.cameras.main.setBackgroundColor('#6db5ae');
```

### Replace fonts
```typescript
// OLD:
{ fontFamily: 'monospace', fontSize: '14px', color: '#cccce0' }

// NEW:
{ fontFamily: "'Georgia', serif", fontSize: '14px', color: '#2a1a0a' }
```

### Replace button backgrounds
```typescript
// OLD button fill:
fillColor = 0x222244;  // dark purple

// NEW button fill:
fillColor = 0xe8dfc0;  // PARCHMENT_MID
borderColor = 0xc8a96e;  // PARCHMENT_DARK
```

### Replace city node textures (BootScene)
The `generatePlaceholderTextures()` method should be updated to draw:
- `city`: white/cream fill + dark brown stroke (hollow, ~16 px radius, 32×32 canvas)
- `city_bonus`: same + small number badge graphic
- `city_pickup`: same + subtle fill variation
- `spy_marker`: green diamond kite path (24×32 canvas)
- `city_highlight`: dashed red ring on transparent bg

### Map edges
```typescript
// OLD:
const COL_EDGE = 0x5577aa;
const COL_EDGE_ADJACENT = 0x66ddff;

// NEW:
const COL_EDGE = 0x7a4030;          // MAP_EDGE brown
const COL_EDGE_ADJACENT = 0xcc3322; // MAP_EDGE_ADJACENT red, dashed
```

---

## 16. Asset Checklist

When implementing the full visual style, these assets are needed:

| Asset | Description | Format |
|---|---|---|
| `map_europe` | Illustrated Europe silhouette (land + ocean) | PNG/SVG, full canvas |
| `spy_marker` | Green diamond kite shape | PNG 24×32 or generated |
| `target_marker` | Red diamond kite shape | PNG 24×32 or generated |
| `city` | Hollow circle node, parchment style | Generated in BootScene |
| `city_bonus` | Same + badge | Generated |
| `city_pickup` | Variation | Generated |
| `city_highlight` | Dashed red ring | Generated |
| `btn_control` | Control icon (circle/bullseye) | SVG 32×32 |
| `btn_strike` | Dagger/stiletto icon | SVG 32×32 |
| `btn_wait` | Hourglass icon | SVG 32×32 |
| `btn_locate` | Map pin icon | SVG 32×32 |
| `btn_deep_cover` | Disguise/hat icon | SVG 32×32 |
| `btn_prep` | Book/scroll icon | SVG 32×32 |
| `dot_texture` | Halftone dot overlay for banners | PNG, tileable |

Until real assets exist, generate textures programmatically in `BootScene` following the parchment colour palette.

---

## 17. Phaser Scene Depth Layers

| Depth | Contents |
|---|---|
| 0–1 | Map background, ocean fill |
| 2–3 | Land silhouette |
| 4–5 | City nodes, city highlights |
| 6–7 | Edges, starting markers |
| 8–9 | (reserved) |
| 10 | Player spy marker |
| 11–14 | (reserved) |
| 15 | Opponent target marker |
| 20–25 | HUD overlays (turn text, intel, etc.) |
| 50 | Action bar background |
| 51–55 | Action buttons |
| 100 | Tooltips |
| 500–510 | Notification banners |
| 1000–1010 | Game-over modal overlay + card |
| 1011–1015 | Game-over modal content |

---

## 18. Responsive Layout Notes

The Phaser canvas is fixed-size. When laying out elements:

- Left sidebar: fixed 85 px wide, full height, flush left
- Action bar: full canvas width, 80 px tall, flush bottom
- Usable map area: `(canvas.width - 85) × (canvas.height - 80)`, offset by `(85, 0)`
- HUD top-left labels: anchor to `(95, 12)` (inside map area, past sidebar)
- HUD top-right player names: anchor `(canvas.width - 16, 12)`, right-aligned
- Centre banners: `canvas.width / 2` (centre of full canvas, not map area)
