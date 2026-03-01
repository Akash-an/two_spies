# Two Spies — User Journey

This document describes the complete player experience from opening the game in a browser to an active match.

---

## Overview

The journey has **6 phases**, managed by the React layer (`App.tsx`) as overlay screens on top of the Phaser canvas. The Phaser scene pipeline (`BootScene → LobbyScene → GameScene`) runs underneath, but the React overlays control visibility until the match begins.

```
┌──────────────┐     ┌───────┐     ┌────────────────────────┐     ┌──────────┐
│ Entering Name│ ──▶ │ Lobby │ ──▶ │ Creating  OR  Joining  │ ──▶ │ Playing  │
└──────────────┘     └───────┘     └────────────────────────┘     └──────────┘
```

---

## Phase 1: Entering Name (`entering-name`)

**What the player sees:**  
A centered modal (`PlayerNameModal`) over a dark background. It contains:
- Title: "Enter Your Codename"
- A text input field (auto-focused)
- A "Begin Game" button
- Helper text: "Leave blank to generate a random codename."

**Behaviour:**
- If the player types a name and presses Enter (or clicks "Begin Game"), that name is used.
- If the field is left empty, a random codename is generated from adjective+noun combos (e.g. "SilentFox", "KeenCipher").

**What happens underneath:**
- On mount, the app establishes a WebSocket connection to `ws://localhost:8080`. If the real server is unavailable, it falls back to `MockNetworkClient`.
- Phaser boots → `BootScene` preloads placeholder textures → transitions to `LobbyScene` (visual backdrop only).

**On submit:**
- Name is stored in React state and pushed into the Phaser registry (`playerName`).
- `SET_PLAYER_NAME` message is sent to the server.
- Phase transitions to `lobby`.

---

## Phase 2: Lobby (`lobby`)

**What the player sees:**  
A full-screen overlay displaying:
- The player's codename in gold text
- "Your codename" subtitle
- Two buttons side by side:
  - **Start Game** (filled gold button) — creates a new match room
  - **Join Game** (outlined gold button) — opens the code-entry screen

**Behaviour:**
- Clicking **Start Game** sends `CREATE_MATCH` to the server → transitions to Phase 3a (`creating`).
- Clicking **Join Game** transitions to Phase 3b (`joining`) with no server message yet.

---

## Phase 3a: Creating a Match (`creating`) — Host Path

**What the player sees:**
- Player's codename
- Instruction text: "Share this code with your opponent:"
- A large 4-digit room code (e.g. `4 8 2 7`) displayed in 48px gold monospace
- A spinner with text: "Waiting for opponent to join…"
- A "Cancel" button to return to the lobby

**Network flow:**
1. Client sends `CREATE_MATCH` to server.
2. Server creates a new `Match`, generates a unique 4-digit code (1000–9999), and responds with:
   - `MATCH_CREATED` — contains `{ code: "4827" }`
   - `WAITING_FOR_OPPONENT` — informational
3. The React overlay reads the code from `MATCH_CREATED` and displays it.
4. The host shares this code out-of-band (voice, text, etc.) with their opponent.

**Waiting:**
- The player stays on this screen until the opponent joins using the code. When that happens, the server sends `MATCH_START` to both players → transition to Phase 5 (`playing`).

**Cancel:**
- Clicking "Cancel" returns to the lobby. (The server-side match remains, but will be cleaned up on disconnect.)

---

## Phase 3b: Joining a Match (`joining`) — Joiner Path

**What the player sees:**
- Player's codename
- Instruction text: "Enter the 4-digit room code:"
- A large styled text input (maxLength 4, digits only, auto-focused)
- Two buttons:
  - **Join** — submits the code
  - **Back** — returns to the lobby

**Input validation (client-side):**
- Non-digit characters are stripped as the player types.
- On submit, the code must be exactly 4 digits or an error message appears: "Please enter a valid 4-digit code."

**On valid submit:**
- `JOIN_MATCH` with `{ code: "4827" }` is sent to the server.
- Phase transitions to `waiting`.

---

## Phase 4: Waiting to Join (`waiting`)

**What the player sees:**
- Player's codename
- A spinner with text: "Joining match…"

**Network flow:**
1. The server receives `JOIN_MATCH` with the code.
2. If valid: the server adds the joiner to the match, starts the game, and sends `MATCH_START` to both players → transition to Phase 5.
3. If invalid (bad code, room full, etc.): the server sends `ERROR` with a message → the React overlay shows the error and transitions back to `lobby`.

---

## Phase 5: Playing (`playing`)

**What the player sees:**
- All React overlays are hidden.
- The Phaser canvas fills the viewport.
- `LobbyScene` receives the `MATCH_START` event and transitions to `GameScene`.

**GameScene UI:**
- **Board:** A city-graph rendered via `BoardRenderer` — cities as circles, edges as lines, player marker on their current city. When opponent's location is revealed (via Locate ability), a prominent **pulsing yellow marker** appears at their city. The marker **disappears automatically** after the opponent takes any action (move, strike, wait, or ability).
- **HUD (top-left):** Turn number, current turn indicator, Intel count, actions remaining, current city, cover status.
- **HUD (top-right):** Player codename and "vs {OpponentName}".
- **Action bar (bottom-center):** Five buttons:
  - **Move** — enter move mode; click an adjacent city to move there (toggleable).
  - **Strike** — immediately strike at your current location (no target selection).
  - **Locate** — use Locate ability to reveal opponent's position.
  - **Wait** — consume an action point without doing anything.
  - **End Turn** — manually end the current turn (auto-ends after 2 actions).
- **Status text (bottom):** Prominent contextual messages (errors, mode indicators).
- **Button states:** Buttons are disabled (grey) when it's not your turn.

**Gameplay loop:**
1. Server sends `MATCH_STATE` containing the player-filtered view (own position, intel, actions, map, etc.; opponent position hidden unless revealed).
2. Player selects an action (Move/Strike/Locate/Wait). Move requires clicking a target city; others execute immediately.
3. Server validates the action, updates state, and broadcasts new `MATCH_STATE` to both players.
4. After using 2 actions, the turn automatically ends. Players can also manually click "End Turn".
5. Repeat until a successful strike on the opponent's city triggers `GAME_OVER`.

---

## Error Handling

| Scenario | What the player sees |
|---|---|
| WebSocket connection fails | Automatic fallback to `MockNetworkClient` (offline play) |
| Invalid room code | Error message in red on the lobby screen; returned to lobby phase |
| Room full | Error message: "Room is full or no longer available." |
| Action rejected (e.g., not adjacent) | Red status text in the GameScene HUD |
| No actions remaining | Error status: "No actions remaining — end your turn." |

---

## Technical Notes

- **React manages all pre-game UI** (name entry, lobby, code display/input). Phaser only activates for gameplay rendering.
- **Network client interface** (`INetworkClient`) is shared by `WebSocketClient` (real server) and `MockNetworkClient` (offline mock). Scenes and React components never know which is active.
- **Room codes are single-use.** Once a joiner connects, the code is removed from the server's lookup map.
- **Phaser scene pipeline:** `BootScene` (asset preloading) → `LobbyScene` (visual backdrop) → `GameScene` (active play). The transition from Lobby to Game is triggered by the `MATCH_START` network event.
