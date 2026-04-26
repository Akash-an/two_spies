# Design System: Aegis Terminal

Cinematic, futuristic command-terminal aesthetic.

---

## 🎨 Color Palette

| Token | Hex | Usage |
|---|---|---|
| `ts-bg-deep` | `#06131A` | App background. |
| `ts-panel` | `#07262B` | Modal backdrop (use `rgba(7,38,43,0.75)` for glass). |
| `ts-neon` | `#00E6FF` | Primary cyan accent (input glow, wiring). |
| `ts-gold` | `#FFB84D` | Primary CTA fill (ESTABLISH CONNECTION). |
| `ts-text-cyan` | `#BFF7FF` | Readable primary text. |
| `ts-muted` | `#7BC1B6` | Secondary labels and annotations. |

---

## 📐 Geometry & Effects

- **Modals:** `rounded-2xl`, 1px border (`ts-panel-border`).
- **Inputs:** `rounded-full` (pill-shaped), inner glow.
- **Buttons:** `rounded-lg`, gradient from `ts-gold` to `ts-gold-deep`.
- **Glow:** Use `box-shadow: 0 6px 30px rgba(0, 230, 255, 0.18)` for neon accents.

---

## 🔡 Typography

- **Headers:** `font-orbitron` (Orbitron), extra-bold, uppercase, wide tracking.
- **Terminal:** `font-mono` (VT323 / Roboto Mono), light cyan.
- **Buttons:** Bold, uppercase, tracking-wide.

---

## 🛠 Core Components

- **WorldMapBackground:** Full-screen grid + map imagery.
- **AuthModal:** Translucent glassy shell for terminal interfaces.
- **NeonInput:** Pill-shaped input with a cyan ring glow.
- **PrimaryCTA:** Large gold-gradient button for major actions.

---

## 🚀 Tailwind Configuration

Add these to your `tailwind.config.js` `theme.extend`:

```js
colors: {
  'ts-bg-deep': '#06131A',
  'ts-panel': '#07262B',
  'ts-neon': '#00E6FF',
  'ts-gold': '#FFB84D',
  'ts-text-cyan': '#BFF7FF',
  'ts-muted': '#7BC1B6',
}
```
