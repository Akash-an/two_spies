# City UI Visual Reference

In the **Two Spies** tactical interface (Aegis Terminal), cities undergo various visual transformations based on their current status, presence of operatives, and tactical events.

## 1. Base City States

| State | Fill Color | Border / Stroke | Effect |
| :--- | :--- | :--- | :--- |
| **Neutral (Default)** | Dark Slate (`#507a7a`), 70% Opacity | Width: 1.5px, Brighter Stroke | Solid presence, clear baseline |
| **Controlled (Yours)** | **Neon Green** (`#00ff41`), 80% Opacity | Width: 2px, Solid Green | Bright, high-visibility |
| **Controlled (Enemy)** | **Tactical Red** (`#ff4444`), 80% Opacity | Width: 2px, Solid Red | Aggressive red highlight |
| **Disappeared** | Dark Gray (`#222`), 15% Opacity | Width: 1px, Dark Stroke | Red "**X**" overlay; label strikethrough; faded presence |

---

## 2. Operative Presence

When an operative is detected or located in a city, the city circle expands from **12px** to **16px** and adds a floating **Marker Pointer** above it.

| Presence Type | Circle Style | Marker Style |
| :--- | :--- | :--- |
| **Agent (You)** | Green fill (40% Op), Neon Green border | Green Pointer with floating animation |
| **Exposed (You)** | Green fill (40% Op), Neon Green border | White stroke on pointer; **Pulsing Glow** |
| **Opponent (Known)** | Red fill (30% Op), Red border | Red Pointer with floating animation |

---

## 3. Intel & Action Pickups

Cities with active pickups use **Ripple Animations** to draw attention.

| Type | Fill Color | Overlay Icon | Animation |
| :--- | :--- | :--- | :--- |
| **Intel Popup** | Transparent / Faded | **Amber** border (2px) | Amount in amber; pulsing glow + ripple |
| **Action Pickup** | Transparent / Faded | **Cyan** border (2px) | ⚡ in cyan; pulsing glow + ripple |

---

## 4. Tactical Highlights & Selection

These changes occur during your turn as you interact with the map.

| Interaction | Fill Color | Border / Stroke | Radius |
| :--- | :--- | :--- | :--- |
| **Adjacent (Move Option)** | Cyan (`#00ffff`), 60% Opacity | **Amber** dashed (2px) | 14px |
| **Target (Selected)** | **Amber** (`#fe9800`), 90% Opacity | Solid White (2px) | 14px |
| **Inspected (Center)** | Cyan (`#00ffff`), 70% Opacity | Light Cyan solid (2px) | 14px |

---

## 5. Specialized Indicators (Rings)

Rings appear outside the city circle (Radius + 2px or 4px) to denote special roles or upcoming events.

*   **Target for Destruction:** An **Amber** dashed ring with a pulsing scale animation (`scheduled-ring`) used to warn players that a city is about to be destroyed.
*   **Stranded Indicator:** When an operative is in a city that has disappeared, a persistent warning banner appears in the tactical log, and the city continues to show the red "**X**" overlay despite the operative's presence.

---

## 6. Edge Visuals (Map Connections)

*   **Standard Edge:** Cyan, 1.5px width, dashed, low opacity (`0.3`).
*   **Active Path:** When you highlight your current city, the edges connected to it turn **Solid Amber**, 2.5px width, with a glowing drop-shadow.
