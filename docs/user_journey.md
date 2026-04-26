# Two Spies — User Journey

This document describes the player experience from opening the game to completing a match.

---

## 1. Codename Authorization (`entering-name`)
Players enter a centered modal to define their identity.
- **Input:** Text field for codename.
- **Auto-generate:** Leave blank to receive a random adjective-noun combo (e.g., "SilentFox").
- **Submit:** Establishes connection and moves to the Lobby.

---

## 2. Mission Deployment Hub (`lobby`)
The main menu for match coordination.
- **Start Game:** Creates a new match room and generates a 4-digit code.
- **Join Game:** Opens a field to enter an opponent's 4-digit code.

---

## 3. Secure Link Establishment (`creating`/`joining`)
- **Host:** Displays a large code (e.g., `4 8 2 7`) and waits for the opponent.
- **Joiner:** Enters the shared code to establish the secure link.
- **Sync:** Once both are connected, the match starts automatically.

---

## 4. Surveillance Command Center (`playing`)
The main tactical display for gameplay.
- **Board:** 2D city graph. Players see themselves as solid icons (visible) or translucent icons (hidden).
- **HUD:** Displays Intel count, actions remaining, and current turn status.
- **Actions:**
  - **Move:** Click an adjacent city.
  - **Strike:** Attempt to eliminate the opponent at your current location.
  - **Locate:** Spend Intel to reveal the opponent's pulsing yellow marker.
  - **Wait:** Consume an action without moving.
  - **End Turn:** Manually pass the turn (auto-ends after 2 actions).

---

## 5. Match Termination
- **Victory:** A successful strike on the opponent's city.
- **Forfeit:** Clicking "TERMINATE LINK" ends the match immediately, resulting in a loss for the aborter.
- **Game Over:** Both players are notified of the result and return to the authorization screen.
