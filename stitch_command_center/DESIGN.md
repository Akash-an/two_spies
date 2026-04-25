# Design System Strategy: The Tactical Intelligence Layer

## 1. Overview & Creative North Star
The **Creative North Star** for this design system is **"The Digital Panopticon."** 

This is not a standard dashboard; it is a high-stakes, high-fidelity espionage tool. We are moving away from the "web app" aesthetic and toward a "hardware-integrated" interface. The experience must feel like a singular, physical piece of equipment—a glowing terminal in a cold, dark room.

To break the "template" look, we utilize **intentional asymmetry** and **tonal depth**. Layouts are driven by data density rather than standard 12-column grids. We use overlapping elements—such as technical scanlines and "floating" terminal readouts—to create a sense of information overload that is paradoxically organized. High-contrast typography scales emphasize the tension between cold, hard data and urgent tactical decisions.

## 2. Colors
Our palette is anchored in the void of `surface` (#0c0e0f), utilizing neon-chroma accents to guide the eye through the shadows.

*   **Primary (Glowing Cyan - #c1fffe / #00ffff):** Reserved for "Active Intelligence." This is the signal in the noise. Use it for the most critical interactive elements and primary status indicators.
*   **Secondary (Tactical Orange - #fe9800):** Reserved for "Operational Alerts." This color should represent human intervention points, warnings, or high-priority mission objectives.
*   **Surface Hierarchy (The "No-Line" Rule):** 1px solid borders for sectioning are strictly prohibited. Boundaries are defined by the `surface-container` hierarchy.
    *   **Nesting:** Place a `surface-container-high` module inside a `surface-container-low` region to create natural focus.
    *   **The Glass & Gradient Rule:** For tactical overlays (like the world map or decryption windows), use Glassmorphism. Apply `surface-variant` with a 40-60% opacity and a `20px` backdrop-blur. 
    *   **Signature Textures:** Main CTAs should utilize a subtle linear gradient from `primary` (#c1fffe) to `primary_dim` (#00e6e6) at a 45-degree angle to simulate the luminescence of a CRT monitor.

## 3. Typography
The system uses a bi-font strategy to differentiate between the "System" and the "Operative."

*   **Display & Headlines (Space Grotesk):** These are used for high-level tactical headers. The wide, geometric nature of Space Grotesk feels authoritative and modern.
*   **Body & Labels (Inter):** For general instruction and labels, Inter provides maximum legibility in high-stress dark mode environments.
*   **The Terminal Monospace (Data Readouts):** While not in the core tokens, all dynamic data (coordinates, timestamps, frequency codes) must be rendered in a monospaced font to ensure "character-locked" alignment, mimicking a real-time data stream.
*   **Hierarchy:** Use `display-lg` for mission-critical codes and `label-sm` for technical metadata. The contrast between these two extremes creates the "Editorial War Room" feel.

## 4. Elevation & Depth
In a surveillance environment, depth is information. We achieve this through **Tonal Layering** rather than drop shadows.

*   **The Layering Principle:** Stack `surface-container-lowest` (pure black) for background maps and `surface-container-highest` for active window modules. This creates a "light-box" effect where the UI feels like it's emitting light.
*   **Ambient Shadows:** If a module must float (e.g., a modal or notification), use a shadow tinted with `surface_tint` (#c1fffe) at 5% opacity with a 32px blur. This mimics the "glow" of a screen reflecting off a surface.
*   **The "Ghost Border" Fallback:** For tactical containment (like an input field), use the `outline_variant` token at 20% opacity. It should look like a faint scanline, not a structural wall.
*   **Technical Scanlines:** Overlay a 2px repeating linear gradient of transparent and `surface_bright` (at 5% opacity) over the entire UI to ground the experience in the "Command Center" theme.

## 5. Components

*   **Buttons**: 
    *   *Primary:* Solid `primary` background with `on_primary` text. Use a "clipped corner" effect (via CSS `clip-path`) to move away from standard rounded rectangles.
    *   *Secondary (Tactical):* Outline of `secondary_dim` with a subtle outer glow.
*   **Input Fields**: Forbid standard boxes. Use a "bottom-line only" approach or a `surface-container-high` block with a `primary` pulse animation on the cursor to represent an active terminal link.
*   **Cards & Lists**: Use vertical whitespace and `surface` shifts. Forbid divider lines. To separate "Recent Intel" from "Active Agents," use a 16px gap and a slight shift from `surface-container-low` to `surface-container-medium`.
*   **Tactical Chips**: Small, `label-sm` elements with `secondary_container` backgrounds. Use these for metadata like "LOCATION: BERLIN" or "STATUS: COMPROMISED."
*   **The Map Overlay**: The world map is a background component. It should use `outline_variant` for the grid lines and `primary_dim` for the "Network Nodes" (connected dots).

## 6. Do's and Don'ts

### Do:
*   **DO** use asymmetry. A heavy data panel on the left balanced by a large, minimalist map on the right creates a sophisticated, bespoke feel.
*   **DO** use "Glow States." When a mission is selected, the container should have a subtle outer bloom of `primary` color.
*   **DO** ensure accessibility. Ensure that `on_surface_variant` (muted gray) text is only used for non-essential technical "flavor" text. Critical data must use `on_surface` (white).

### Don't:
*   **DON'T** use 100% opaque, white-on-black borders. It looks like a 1990s website rather than a 2024 command center.
*   **DON'T** use standard Material Design "elevated" cards with heavy shadows. This interface should feel "flat but deep," like a high-end OLED display.
*   **DON'T** mix the accent colors. `Cyan` is for the system; `Orange` is for the threat/human action. Mixing them in a single component creates visual confusion.