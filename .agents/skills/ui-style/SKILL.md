---
name: ui-style
description: >-
  Visual design reference for Two Spies UI/UX in stitch-stitch-frontend. Use this skill
  whenever implementing or restyling React components, including buttons, modals,
  panels, cards, or any visual element. Covers cyberpunk Cold War aesthetic with
  Tailwind CSS + Material Symbols. Trigger: style, color, theme, art style, UI,
  button, modal, panel, card, layout, responsive, font, typography, visual,
  Tailwind, component, stitch-stitch-frontend, Aegis, Terminal.
---

# Two Spies — UI Style Reference (stitch-stitch-frontend)

Canonical visual design for React components in `stitch-stitch-frontend/src/components/`.
Use Tailwind CSS utilities with custom color tokens from `tailwind.config.js`.
Always consult these specs before implementing any visual element in stitch-stitch-frontend.

---

## 1. Art Direction

**stitch-stitch-frontend** uses a high-tech **Aegis Terminal tactical display** aesthetic with neon accents.

Key descriptors:
- Dark background (`#0c0e0f` — near-black deep space)
- Bright cyan (`#00ffff`/`#c1fffe`) primary accent for interactive elements, focus states, and active indicators
- Orange/amber (`#fe9800`) secondary accent for secondary actions, alerts, and CTAs
- Material Design Symbols (Google Fonts) for all icons
- Space Grotesk for headlines (tech/futuristic feel)
- Inter for body text (clean, readable)
- Scanline overlays and grid effects for retro computer aesthetic
- Glowing text shadows and neon blur effects for emphasis
- Modular component design with Tailwind CSS utility-first approach

**Components are organized in `stitch-stitch-frontend/src/components/`:**
- `CodenameAuthorizationTerminal/` — Login/name entry screen
- `MissionDeploymentHub/` — Awaiting match assignment
- `SecureLinkFrequency/` — Room code entry to join match
- `SurveillanceCommandCenterGlobal/` — Active game play with world map
- `WorldMapCanvas/` — Interactive city graph and player visualization

---

## 2. Color Palette (stitch-stitch-frontend)

All colors defined in `stitch-stitch-frontend/tailwind.config.js`. Use Tailwind class names directly.

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| **Primary** | `#c1fffe` | `text-primary` / `bg-primary` | Headlines, active buttons, focus states, glowing text |
| **Primary (Dimmed)** | `#00e6e6` | `text-primary-dim` | Hover states, secondary highlights |
| **Primary Container** | `#00ffff` | `bg-primary-container` | Full-bright neon accents, scanline effects |
| **Secondary** | `#fe9800` | `text-secondary` / `bg-secondary` | CTAs, secondary buttons, alerts, warnings |
| **Secondary (Dimmed)** | `#eb8d00` | `text-secondary-dim` | Secondary hover, dimmed warnings |
| **Tertiary** | `#e2fffe` | `text-tertiary` | Tertiary highlights, subtle accents |
| **Surface (Base)** | `#0c0e0f` | `bg-surface` | Main background, deep space |
| **Surface Lowest** | `#000000` | `bg-surface-container-lowest` | Input fields, panels without emphasis |
| **Surface Low** | `#111415` | `bg-surface-container-low` | Panel backgrounds, secondary surfaces |
| **Surface (Mid)** | `#181a1b` | `bg-surface-container` | Cards, modal content, standard panels |
| **Surface High** | `#1d2021` | `bg-surface-container-high` | Modal overlays, emphasized containers |
| **Surface Highest** | `#232628` | `bg-surface-container-highest` | Top-level modals, priority containers |
| **On Surface** | `#f6f6f7` | `text-on-surface` | Primary text, default foreground |
| **On Surface Variant** | `#aaabac` | `text-on-surface-variant` | Secondary text, metadata, timestamps |
| **Outline** | `#747577` | `border-outline` | Standard borders, dividers, accents |
| **Outline Variant** | `#464849` | `border-outline-variant` | Subtle borders, secondary dividers |
| **Error** | `#ff716c` | `text-error` / `bg-error` | Error messaging, destructive actions, red alerts |

### Color Usage Guide

- **Cyan (`#c1fffe`)**: Use for all interactive elements (buttons, links), focus states, and active indicators. Creates the classic neon cyberpunk feel.
- **Orange (`#fe9800`)**: Use for secondary actions, call-to-action buttons, warnings, and alerts. Complements cyan for high contrast.
- **Surface tones**: Use hierarchically — `surface-container` for cards, `surface-container-high` for modals, `surface-container-highest` for top-level overlays.
- **Text colors**: `on-surface` for primary text, `on-surface-variant` for secondary/metadata, `error` for warnings.

---

## 3. Typography (stitch-stitch-frontend)

**Font Families (loaded via Google Fonts in `stitch-stitch-frontend/index.html`):**
- `Space Grotesk` — Headlines, navigation, emphasis (tech/futuristic)
- `Inter` — Body text, labels, descriptions (clean, readable)
- `Material Symbols Outlined` — Icons throughout UI

| Usage | Font | Size | Weight | Style | Classes |
|---|---|---|---|---|---|
| Screen title | Space Grotesk | 24–32 px | Bold (700) | Uppercase, tracking-widest | `text-2xl md:text-3xl font-bold font-headline tracking-widest uppercase` |
| Section heading | Space Grotesk | 18–20 px | Bold (700) | Uppercase | `text-lg md:text-xl font-bold font-headline tracking-wide uppercase` |
| Subheading | Space Grotesk | 14–16 px | Semi-bold (600) | Normal or uppercase | `text-base md:text-lg font-semibold font-headline` |
| Label / metadata | Space Grotesk | 10–12 px | Medium (500) | Uppercase, condensed | `text-[10px] md:text-xs font-medium font-headline tracking-widest uppercase` |
| Body text | Inter | 14–16 px | Regular (400) | Normal | `text-sm md:text-base font-normal font-body` |
| Button label | Space Grotesk | 12–14 px | Bold (700) | Uppercase | `text-xs md:text-sm font-bold font-headline uppercase tracking-wide` |
| Status / tech text | Courier New / monospace | 10 px | Regular (400) | Normal | `text-[10px] font-mono` |
| Icon | Material Symbols | 20–24 px | 400 weight | Normal | `material-symbols-outlined text-lg md:text-2xl` |
| Timestamp / small text | Inter | 9–11 px | Regular (400) | Normal | `text-[9px] md:text-xs text-on-surface-variant` |

### Typography Classes (Tailwind)

Define these in your components:
```jsx
<h1 className="text-2xl md:text-3xl font-bold font-headline tracking-widest uppercase">Title</h1>
<p className="text-sm md:text-base font-normal text-on-surface">Body text</p>
<button className="text-xs font-bold font-headline uppercase tracking-wide">Button</button>
```

---

## 4. Common Component Patterns

### Buttons

**Primary (CTA) Button:**
```jsx
<button className="px-6 py-3 bg-secondary text-on-secondary font-headline font-bold uppercase tracking-wide rounded hover:bg-secondary-dim active:scale-95 transition-all">
  ACTION
</button>
```

**Secondary Button (Outline):**
```jsx
<button className="px-6 py-3 border-2 border-primary text-primary font-headline font-bold uppercase tracking-wide rounded hover:bg-primary/10 active:scale-95 transition-all">
  SECONDARY
</button>
```

**Danger Button:**
```jsx
<button className="px-6 py-3 border-2 border-error text-error font-headline font-bold uppercase rounded hover:bg-error/10 active:scale-95 transition-all">
  ABORT
</button>
```

**Disabled Button:**
```jsx
<button disabled className="px-6 py-3 bg-outline text-on-surface-variant font-headline font-bold uppercase rounded opacity-50 cursor-not-allowed">
  LOCKED
</button>
```

### Modals / Overlays

```jsx
<div className="fixed inset-0 bg-black/60 backdrop-blur-lg flex items-center justify-center">
  <div className="bg-surface-container-high border-2 border-primary/30 rounded-lg p-6 md:p-8 max-w-md">
    <h2 className="text-2xl font-bold font-headline text-primary mb-4">Modal Title</h2>
    <p className="text-on-surface mb-6">Modal content goes here.</p>
    <div className="flex gap-3">
      <button className="flex-1 px-4 py-2 bg-secondary text-on-secondary hover:bg-secondary-dim">OK</button>
      <button className="flex-1 px-4 py-2 border border-primary text-primary hover:bg-primary/10">Cancel</button>
    </div>
  </div>
</div>
```

### Cards / Panels

```jsx
<div className="bg-surface-container border border-outline/50 rounded p-4 md:p-6">
  <h3 className="text-sm font-bold font-headline uppercase text-primary mb-3">Panel Header</h3>
  <p className="text-on-surface-variant text-sm">Panel content</p>
</div>
```

### Input Fields

```jsx
<input
  type="text"
  placeholder="Enter text..."
  className="w-full px-4 py-2 bg-surface-container-lowest border border-outline focus:border-primary focus:outline-none text-on-surface placeholder:text-on-surface-variant transition-colors"
/>
```

### Lists / Navigation Items

```jsx
<nav className="border-t border-outline-variant">
  {items.map((item, idx) => (
    <button
      key={idx}
      className={`w-full py-4 px-6 flex items-center gap-4 font-headline text-sm transition-all
        ${active ? 'bg-primary/10 text-primary border-l-4 border-primary' : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary'}
      `}
    >
      <span className="material-symbols-outlined">{item.icon}</span>
      {item.label}
    </button>
  ))}
</nav>
```

---

## 5. Layout & Responsive Design

### Container Layout Pattern

Use Tailwind's `flex` and `grid` for layout:

```jsx
<div className="flex flex-col md:flex-row gap-6">
  <aside className="w-full md:w-64 bg-surface-container border-r border-outline-variant">
    {/* Sidebar */}
  </aside>
  <main className="flex-1">
    {/* Main content */}
  </main>
</div>
```

### Responsive Breakpoints

- **Base (Mobile)**: No prefix, applies to all screens
- **Tablet+**: `md:` prefix for 768px+
- **Desktop**: `lg:` prefix for 1024px+

Example:
```jsx
<h1 className="text-xl md:text-2xl lg:text-3xl">Responsive Title</h1>
```

---

## 6. Effects & Animations

### Scanline Overlay (Retro Effect)

```jsx
<div className="fixed inset-0 pointer-events-none" style={{
  backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
  zIndex: 50,
}} />
```

### Neon Glow Text

```jsx
<h1 className="text-primary" style={{
  textShadow: '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.4)',
}}>
  NEON TEXT
</h1>
```

### Pulse Animation (Alert)

```jsx
<div className="animate-pulse bg-secondary/20 border border-secondary rounded p-4">
  Alert message
</div>
```

### Hover Scale

```jsx
<button className="hover:scale-105 active:scale-95 transition-transform">Click Me</button>
```

---

## 7. Tailwind Configuration Reference

The complete color system is defined in `stitch-stitch-frontend/tailwind.config.js`:

```javascript
colors: {
  'primary': '#c1fffe',
  'primary-dim': '#00e6e6',
  'primary-container': '#00ffff',
  'secondary': '#fe9800',
  'secondary-dim': '#eb8d00',
  'tertiary': '#e2fffe',
  'surface': '#0c0e0f',
  'surface-container-lowest': '#000000',
  'surface-container-low': '#111415',
  'surface-container': '#181a1b',
  'surface-container-high': '#1d2021',
  'surface-container-highest': '#232628',
  'on-surface': '#f6f6f7',
  'on-surface-variant': '#aaabac',
  'outline': '#747577',
  'outline-variant': '#464849',
  'error': '#ff716c',
}
```

**All colors are available as:**
- Text: `text-primary`, `text-secondary`, `text-error`, etc.
- Background: `bg-primary`, `bg-secondary`, `bg-surface-container`, etc.
- Border: `border-primary`, `border-outline`, etc.

---

## 8. Material Symbols Icons

Insert Material Symbols from Google Fonts with this pattern:

```jsx
<span className="material-symbols-outlined text-lg md:text-2xl">icon_name</span>
```

Common icon names:
- Navigation: `menu`, `home`, `settings`, `logout`, `close`
- Media: `play_circle`, `pause_circle`, `replay`, `skip_next`
- Action: `check_circle`, `error`, `info`, `warning`, `done`
- Location: `location_on`, `place`, `language`, `public`
- Social: `group`, `person`, `people`, `account_circle`
- Search: `search`, `filter_list`, `sort`, `tune`

View all icons at [fonts.google.com/icons](https://fonts.google.com/icons).

---

## 9. When to Use This Skill

- Implementing new React components in `stitch-stitch-frontend/src/components/`
- Styling buttons, modals, panels, cards, inputs, or navigation
- Adding Material Symbols icons to UI
- Color adjustments, typography changes, or spacing refinement
- Fixing visual alignment or consistency issues
- Ensuring UI matches Aegis Terminal tactical display aesthetic
- Responsive design adjustments for mobile/tablet/desktop

---

## 10. Design System Files

- **Tailwind Config**: `stitch-stitch-frontend/tailwind.config.js` (color tokens, fonts)
- **Global Styles**: `stitch-stitch-frontend/src/styles/index.css` (Tailwind imports, base utilities)
- **Component Styles**: `stitch-stitch-frontend/src/components/ComponentName/ComponentName.css` (scoped overrides)
- **Typography**: Google Fonts loaded in `stitch-stitch-frontend/index.html`

Always check these files before adding custom CSS — prefer Tailwind utilities over custom properties.

