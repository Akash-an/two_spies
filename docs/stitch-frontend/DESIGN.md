# Design System: Command Center
**Project ID:** 6786117631833062266

## Screens (Stitch project)
- Surveillance Command Center — projects/6786117631833062266/screens/b95e31d41b854030a481b32b123de254 (1376×768)
- Surveillance Command Center — projects/6786117631833062266/screens/120cb68853d84043ae3111a2ae35bc97 (1376×768)
- Surveillance Command Center — projects/6786117631833062266/screens/9160e55631a54da4892f51642ed0d8f8 (1376×768)
- Surveillance Command Center — projects/6786117631833062266/screens/3e0a32cd60a74275ae473402a5b1d5db (1376×768)

---

**Design intent / atmosphere**
- Cinematic, cold-war / retro-futuristic command-terminal aesthetic.
- High-contrast neon accents (cyan) on deep teal / navy fields; warm gold/orange used for primary CTAs.
- Dense information layer (map + grid) in the background; foreground modal uses glassy, semi-opaque panels with wide letter-spaced, monospace-like text for the terminal feel.

---

## Color Palette (tokens)
Use these tokens when authoring Tailwind theme extensions or CSS variables. Hex values are approximations sampled from the Stitch screenshots; treat them as authoritative design tokens.

- ts-bg-deep: #06131A — App background (full-screen base). Use for `body` background.
- ts-map-grid: #032A31 — World-map / grid lines behind the UI.
- ts-panel: #07262B (use as `rgba(7,38,43,0.75)` for glassy panels) — Main modal backdrop.
- ts-panel-border: #08343B — Thin panel border / inner frame.
- ts-neon: #00E6FF — Primary neon accent (input glow, wiring).
- ts-neon-soft: #7EF6F5 — Softer neon for secondary UI and subtle text highlights.
- ts-gold: #FFB84D — Primary CTA fill (ESTABLISH CONNECTION).
- ts-gold-deep: #FF8C00 — CTA edge / darker gold gradient stop.
- ts-text-cyan: #BFF7FF — Light readable cyan for primary text over panels.
- ts-muted: #7BC1B6 — Secondary annotations and small labels.

CSS glow examples:
- Neon outer glow: `box-shadow: 0 6px 30px rgba(0, 230, 255, 0.18)`
- CTA glow: `box-shadow: 0 10px 30px rgba(255, 184, 77, 0.18)`

---

## Geometry & Shape (semantic mapping)
Map visual shapes to Tailwind tokens so Stitch can generate consistent class names.

- Modal shell: `rounded-2xl` (soft, large radius — pill-adjacent but boxy)
- Input (central): `rounded-full` (pill-shaped input with inner glow)
- CTA button: `rounded-lg` (noticeable corners but not circular)
- Small status badges / nodes: `rounded-full` (small circles)
- Map nodes / icons: `rounded-sm` or `rounded` depending on emphasis

---

## Depth, Elevation & Lighting
- Primary layering: very flat ambient background (map + grid) → glass panel (slightly translucent) → glowing input & CTA. No heavy material shadows; use directional glow rather than physical shadows.
- Panel border: 1px inward stroke with `ts-panel-border` and faint inner shadow.
- Use dual-layer glow for neon elements: faint spread (`rgba(ts-neon, 0.10)`) and tighter halo (`rgba(ts-neon, 0.22)`).

Suggested box-shadow tokens (Tailwind `boxShadow` entries or CSS variables):
- `neon-sm`: `0 6px 18px rgba(0,230,255,0.12)`
- `neon-lg`: `0 16px 48px rgba(0,230,255,0.14)`
- `cta-lg`: `0 10px 36px rgba(255,184,77,0.14)`

---

## Typography
Goal: convey an authoritative terminal feel while remaining readable.

- Display / Header
  - Font-family: `Orbitron`, fallback `sans-serif` (or a condensed geometric display)
  - Style: uppercase, wide tracking, medium-heavy weight
  - Tailwind mapping: `font-orbitron font-extrabold uppercase tracking-widest text-xl` (scale up on large screens)

- Terminal / Body
  - Font-family: `VT323` / `Roboto Mono` / `Inconsolata` (monospace terminal feel)
  - Style: normal casing for input labels; fixed-width digits where needed
  - Tailwind mapping: `font-mono text-sm leading-tight text-ts-text-cyan`

- Button label
  - Use heavier weight, slightly condensed tracking, small caps effect
  - Tailwind mapping: `font-bold uppercase tracking-wide text-[0.95rem]`

Accessibility: ensure body text on `ts-panel` meets contrast (use `ts-text-cyan` or pure white with subtle opacity for small labels).

---

## Spacing & Layout tokens
- Page container: `min-h-screen flex items-center justify-center p-8`
- Modal max width: `max-w-4xl` (approx 990–1200px center column on desktop)
- Modal padding: `p-8` (desktop) / `p-6` (tablet) / `p-4` (mobile)
- Input vertical padding: `py-4 px-6` (large, comfortable hit area)
- CTA padding: `px-8 py-4` (prominent touch target)

---

## Tailwind theme suggestions (to add to tailwind.config.js)
Add these tokens under `theme.extend` so Stitch-generated classes map to your tokens.

```js
// tailwind.config.js (example additions)
export default {
  theme: {
    extend: {
      colors: {
        'ts-bg-deep': '#06131A',
        'ts-panel': '#07262B',
        'ts-panel-border': '#08343B',
        'ts-neon': '#00E6FF',
        'ts-neon-soft': '#7EF6F5',
        'ts-gold': '#FFB84D',
        'ts-gold-deep': '#FF8C00',
        'ts-text-cyan': '#BFF7FF',
        'ts-muted': '#7BC1B6',
      },
      boxShadow: {
        'neon-sm': '0 6px 18px rgba(0,230,255,0.12)',
        'neon-lg': '0 16px 48px rgba(0,230,255,0.14)',
        'cta-lg': '0 10px 36px rgba(255,184,77,0.14)'
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        terminal: ['VT323', 'Roboto Mono', 'monospace'],
      }
    }
  }
}
```

---

## Component breakdown & props (map to existing React logic)
Create small, focused components so game logic stays separate from rendering.

- `WorldMapBackground`
  - Responsibility: render world map image + grid + faint animated pulses (pure presentational)
  - Props: `dim?: boolean`, `opacity?: number`
  - Tailwind: `absolute inset-0 bg-ts-map-grid bg-cover bg-center`

- `AuthModal` (modal shell containing the terminal)
  - Responsibility: layout, panel backdrop, accepts children
  - Props: `title: string`, `children`, `className?`
  - Tailwind: `mx-auto max-w-4xl rounded-2xl bg-[rgba(7,38,43,0.75)] border border-ts-panel-border p-8 relative`

- `NeonInput`
  - Responsibility: stylized input with neon glow and accessible label
  - Props: `value`, `onChange`, `placeholder`, `name`
  - Tailwind recipe: `w-full rounded-full py-4 px-6 bg-ts-panel text-ts-text-cyan placeholder-ts-muted ring-2 ring-ts-neon/30 focus:ring-ts-neon/60 transition`

- `PrimaryCTA`
  - Responsibility: primary action button (ESTABLISH CONNECTION)
  - Props: `onClick`, `label`, `loading?`
  - Tailwind recipe: `inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-b from-ts-gold to-ts-gold-deep text-[#081013] font-bold shadow-cta-lg hover:brightness-110`

---

## Tailwind class recipes (copy-paste)
- Container / page:

```
<div class="min-h-screen bg-ts-bg-deep flex items-center justify-center p-8">
```

- Modal / Shell:

```
<div class="w-full max-w-4xl rounded-2xl bg-[rgba(7,38,43,0.75)] border border-ts-panel-border p-8 relative">
```

- Neon Input:

```
<input class="w-full rounded-full py-4 px-6 bg-ts-panel text-ts-text-cyan placeholder-ts-muted ring-2 ring-ts-neon/20 focus:ring-ts-neon/60 transition" />
```

- Primary CTA:

```
<button class="mt-6 inline-flex items-center justify-center px-8 py-4 rounded-lg bg-gradient-to-b from-ts-gold to-ts-gold-deep text-[#081013] font-bold shadow-cta-lg">ESTABLISH CONNECTION</button>
```

---

## Accessibility & Motion
- Ensure `aria-label` and `aria-describedby` exist for `NeonInput` and CTAs.
- Provide a high-contrast fallback (white text on `ts-panel`) for users with low-vision.
- Respect `prefers-reduced-motion` for animated glows/pulses.

---

## Stitch integration hints (how to prompt Stitch)
When using Stitch to generate React components, ask it to:
- Use the `ts-*` color tokens in class names so output maps to `theme.extend.colors`.
- Prefer `rounded-full` for inputs and `rounded-lg` for CTAs.
- Emit `className` values that match the recipes above (this lets you adopt components without heavy CSS edits).
- Tag text blocks that are terminal text as `font-mono` and headings as `font-orbitron`.

---

## Implementation notes / Next steps
- Add the `theme.extend` color tokens to `tailwind.config.js` (example above) so generated classes resolve exactly.
- Implement the small presentational components (`WorldMapBackground`, `AuthModal`, `NeonInput`, `PrimaryCTA`) and use them inside your existing `App` / `GameScene` React containers.
- Use Stitch to generate variants for small screens; keep the modal padding and font sizes scaled down.

---

Generated from Stitch project "command center" (ID: 6786117631833062266). Use this file as the canonical prompt source when asking Stitch to regenerate or extend UI screens for the project.
