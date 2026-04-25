# AGENTS.md

## Two Spies — Browser Multiplayer Implementation

---

# 1. Project Vision

Build a **browser-based 2D multiplayer strategy game** inspired by *Two Spies*.

The system must be:

* Server-authoritative
* Turn-based
* Multiplayer over WebSockets
* Modular and extensible
* Cleanly separated stitch-frontend and backend

stitch-frontend: **Phaser 3 + TypeScript**
Backend: **C++17 + Boost.Asio/Beast WebSocket server**

This is not a prototype. Code should be production-architected from day one.

---

# 2. Core Design Principles

All AI agents working on this project must follow these rules:

### 2.1 Server Authoritative Model

* The server is the single source of truth.
* The client never calculates final game outcomes.
* The client only sends intents (actions).
* The server validates and updates state.
* The server broadcasts updated state.

---

### 2.2 Separation of Concerns

Strict separation required:

| Layer             | Responsibility             |
| ----------------- | -------------------------- |
| GameState         | Pure rules and logic       |
| Match             | Player session + GameState |
| WebSocket Session | Networking only            |
| Phaser Scene      | Rendering only             |
| NetworkClient     | WebSocket wrapper          |

No cross-layer leakage.

Game logic must never depend on networking code.

---

### 2.3 Deterministic Game Logic

* GameState must be deterministic.
* No random behavior without explicit seeded control.
* No time-based logic inside game core.

---

# 3. High-Level Architecture

## 3.1 stitch-frontend

⚠️ **CANONICAL CLIENT:** As of 2026-04, **`stitch-frontend/` is the only frontend in active development. The old `frontend/` directory is DEPRECATED and must not be used.**

**Main client is at `stitch-frontend/` — a production React + Tailwind + TypeScript project.**

Tech stack:

* React 18 + TypeScript
* Tailwind CSS + Material Design + Cyberpunk styling
* Vite (dev server + build)
* Phaser 3 (embedded for game canvas rendering)

Structure:

```
stitch-frontend/
  src/
    components/           # React components (one folder per component)
      CodenameAuthorizationTerminal/
      MissionDeploymentHub/
      SecureLinkFrequency/
      SurveillanceCommandCenterGlobal/
      SurveillanceCommandCenterGlobalMap/
      WorldMapCanvas/
      PhaserGame/         # Phaser canvas wrapper
    network/              # WebSocket client
      WebSocketClient.ts
      EventEmitter.ts
    types/                # Message types
      Messages.ts
    styles/               # Global styles
      index.css
    main.tsx              # React entry point
  screenshots/            # Testing assets
  vite.config.ts
  index.html
```

**Key Rules:**

* Components must be self-contained with their own .tsx and .css.
* All networking goes through `WebSocketClient.ts`.
* Components emit events or use props callbacks for state changes.
* No hardcoded message strings — use `ClientMessageType` enums.
* Styling follows Tailwind utility classes with cyberpunk colors.
* **No compiled .js files in src/ (tsconfig has noEmit: true). Always edit .tsx/.ts source files.**

**Old `frontend/` directory:**
- ⚠️ Deprecated since 2026-04
- Do NOT use for new development
- Will be removed in a future release
- Tests moved to `tests/stitch-frontend/`
- Docs moved to `docs/stitch-frontend/`

---

## 3.2 Backend

Tech stack:

* C++17
* Boost.Asio
* Boost.Beast
* CMake
* OpenSSL (WSS support)

Structure:

```
backend/
  CMakeLists.txt
  src/
    main.cpp
    server/
      WebSocketServer.h/.cpp
      Session.h/.cpp
    game/
      GameState.h/.cpp
      Match.h/.cpp
      Player.h/.cpp
    protocol/
      Messages.h/.cpp
```

Rules:

* Session handles one connection.
* Match handles two players.
* GameState contains pure logic.
* No networking inside GameState.
* No game rules inside Session.

---

# 4. Gameplay Model

Full rules, mechanics, abilities, turn structure, and win conditions are documented in the canonical Game Design Document:

**[docs/game_design/game_design_doc.md](docs/game_design/game_design_doc.md)**

Key constraints for implementation:

* Each turn grants **2 actions** (move, ability, or strike).
* The server assigns starting cities randomly — positions are **never shared** with the opposing client.
* The server sends **per-player filtered state** — clients only receive what the game rules allow them to see.
* A successful strike on the opponent's city ends the round immediately.
* A failed strike **reveals the striker's position**.

---

# 5. Networking Protocol

Initial protocol uses JSON.

All messages must include:

```json
{
  "type": "STRING_ENUM",
  "payload": {}
}
```

Examples:

Client → Server:

* `JOIN_MATCH`
* `PLAYER_ACTION`
* `END_TURN`

Server → Client:

* `MATCH_STATE`
* `MATCH_START`
* `ERROR`
* `GAME_OVER`

Message parsing must be centralized.

No string duplication.

---

# 6. Development Phases

## Phase 1 — Infrastructure

* Basic Phaser app
* Minimal WebSocket server in C++
* Successful connection
* Echo test message

---

## Phase 2 — Basic Match Flow

* Match creation
* Two players assigned
* Dummy GameState
* Server sends fake state
* stitch-frontend renders simple board

---

## Phase 3 — Core Mechanics

* City graph
* Movement validation
* Turn enforcement
* Intel resource
* Strike logic

---

## Phase 4 — Hidden Information

* Per-player filtered state
* Cover system
* Ability framework

---

## Phase 5 — Production Hardening

* Reconnection logic
* Basic logging
* Error handling
* WSS support
* Input validation

---

# 7. Code Quality Requirements

All agents must:

* Use modern C++ practices
* Avoid raw pointers where possible
* Use RAII
* Prefer std containers
* Keep functions small
* Avoid large God classes
* Write readable code over clever code

stitch-frontend must:

* Use strict TypeScript mode
* Avoid `any`
* Avoid mutable shared state
* Keep Phaser logic isolated

---

# 8. Scalability Guidelines

* Matches stored in memory (initially)
* Design so MatchManager can scale
* Avoid global state
* No singletons unless justified

Future scaling possibility:

* Horizontal scaling
* Redis match coordination
* Match persistence

Do not over-engineer yet, but design extensibly.

---

# 9. Explicit Non-Goals (For Now)

* No database persistence
* No ranking system
* No matchmaking service
* No AI bot
* No microtransactions
* No replay system

Focus is core multiplayer loop.

---

# 10. Security Guidelines

* Never trust client input.
* Validate all actions.
* Reject malformed JSON.
* Enforce turn ownership.
* Prevent action spamming.
* Limit message size.

---

# 11. stitch-frontend Rendering Philosophy

* Phaser handles rendering.
* UI overlays (menus) may use simple HTML.
* Game board is graph-based (cities + edges).
* No complex animation initially.
* Function over polish.

---

# 12. Long-Term Extensibility

Design must allow:

* Ability expansion
* Custom maps
* Spectator mode
* AI opponent
* Mobile browser support

---

# 13. AI Agent Behavior Rules

When generating code:

* Do not combine unrelated responsibilities.
* Do not embed game logic inside networking.
* Do not hardcode city data inside GameState.
* Always design for clarity first.
* Generate minimal working units before expanding.

Prefer incremental scaffolding over large monolithic files.

---

# 14. Success Criteria

The project is successful when:

* Two browser clients connect.
* They are placed in a match.
* They take alternating turns.
* Movement is validated.
* A successful strike ends the game.
* State is synchronized.
* No desync occurs.

---

# 15. Development Scripts

Rebuild scripts live in `scripts/` at the project root. Always use these when code changes need to be compiled and/or the running service needs to be restarted.

| Script | When to use |
| --- | --- |
| `scripts/rebuild-backend.sh` | After any C++ source change |
| `scripts/rebuild-stitch-frontend.sh` | After `vite.config.ts`, env vars, or plugin changes (HMR handles the rest) |
| `scripts/rebuild-all.sh` | Full rebuild of both services |

Logs: `backend/server.log`, `stitch-stitch-frontend/vite.log`

See **`.agents/skills/rebuild-and-restart/SKILL.md`** for full instructions including common troubleshooting.

---

# 16. Debugging Guidelines

**Always check logs first when debugging or troubleshooting issues.**

Log locations:
- Backend: `backend/server.log`
- stitch-frontend: `stitch-stitch-frontend/vite.log`

When a user reports an error or unexpected behavior:
1. Read the relevant log file immediately
2. Identify error messages, stack traces, or warnings
3. Determine root cause before proposing solutions
4. After implementing fixes, verify errors no longer appear in logs

See **`.agents/skills/debug-and-logs/SKILL.md`** for comprehensive debugging workflows and common scenarios.

---

# 18. UI Visual Style

All visual and CSS styling decisions must conform to the **Aegis Terminal** tactical display aesthetic.

Key points:
- **Style Source**: Derived from the high-fidelity tactical HUD designs (cyan/amber neon, dark backgrounds).
- **Core Aesthetic**: Sleek, futuristic, high-contrast, digital command center.
- **Components**: Use `CodenameAuthorizationTerminal` and `MissionDeploymentHub` as the primary visual benchmarks.
- **Colors**: Primary Cyan (`#00ffff`), Warning Amber/Orange (`#fe9800`), Background Deep Black/Navy (`#0c0e0f`).
- **Typography**: `Space Grotesk` for headlines, `JetBrains Mono` for data and terminal logs.

---

# 17. Documentation Updates

When changes are significant (behavioral changes, public APIs, message formats, or other user-visible behavior), **update the relevant project documentation** and mention these updates in your commit message so reviewers notice the change.

## Available Project Documentation

| Document | Purpose | Update When |
| --- | --- | --- |
| [README.md](README.md) | Project overview, quick start, tech stack, deployment instructions | Public APIs, setup changes, new features visible to users |
| [docs/game_design/game_design_doc.md](docs/game_design/game_design_doc.md) | Canonical game rules, mechanics, turn structure, abilities, victory conditions, fog of war | Game rule changes, new abilities, strike/movement logic changes, Intel system changes, cover system changes |
| [docs/architecture.md](docs/architecture.md) | High-level system architecture, component interactions, data flow | Major architectural refactors, new subsystems, component responsibility changes |
| [docs/user_journey.md](docs/user_journey.md) | Player experience flow, UI/UX decisions, game flow narrative | UI changes, player flow changes, onboarding/tutorial modifications |
| [protocol/schemas/](protocol/schemas/) | JSON schema definitions for protocol messages, board state, actions, lobby events | Message format changes, new action types, state structure modifications |
| [AGENTS.md](AGENTS.md) (this file) | AI agent instructions, design principles, development phases | Changes to core principles, new phase requirements, updated skill references |
| [Requirements.md](Requirements.md) | Feature requirements and acceptance criteria | New features, requirement clarifications, scope changes |

## When to Update Documentation

- **Message Format Changes**: Update `protocol/schemas/` and relevant `.ts/.hpp` message definitions
- **Game Rule Changes**: Update `docs/game_design/game_design_doc.md`
- **Architecture Changes**: Update `docs/architecture.md`
- **Public API Changes**: Update `README.md` and relevant doc files
- **UI/UX Changes**: Update `docs/user_journey.md`
- **Setup or Deployment Changes**: Update `README.md`
- **New Features or Abilities**: Update `docs/game_design/game_design_doc.md` and `README.md`

- **Repository layout**: Place all automated tests under the top-level tests/ directory and all project documentation under the docs/ directory to keep tests and docs discoverable and consistent.

