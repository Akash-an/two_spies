# Two Spies — Codebase Guide

> Canonical reference for AI coding agents and new contributors. Start here.

---

## What Is This Project?

**Two Spies** is a browser-based 1v1 multiplayer turn-based strategy game of espionage. Two rival spies move secretly between connected cities on a global map, gather Intel, and attempt to locate and eliminate each other through strikes. It features fog-of-war, an Intel resource economy, ability-based powers, and a shrinking map mechanic that creates board pressure.

**Key characteristics:**
- Server-authoritative: all game logic lives on the server; the client only sends intents
- Turn-based: players alternate turns, 2 actions per turn
- Asymmetric information: players do not see the opponent's position unless revealed by gameplay
- Real-time multiplayer via JSON over WebSocket

---

## Tech Stack

### Frontend (`stitch-frontend/`)
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 3.4 | Utility-first styling |
| Vite | 4.4 | Dev server and build tool |
| Phaser | 3.55 | Game engine (imported but map uses SVG rendering) |
| Playwright | 1.59 | End-to-end testing |

### Backend (`backend/`)
| Technology | Purpose |
|---|---|
| C++17 | Core game logic and networking |
| Boost.Asio | Async I/O event loop |
| Boost.Beast | HTTP/WebSocket protocol handling |
| OpenSSL | TLS/WSS support |
| nlohmann/json | JSON serialization |
| CMake 3.16+ | Build system |

### Transport
- JSON over WebSocket (`ws://` in dev, `wss://` in production)
- Port `8085` (backend)
- All messages follow the envelope format: `{ "type": "...", "payload": { ... } }`

---

## Top-Level Directory Structure

```
two_spies/
├── stitch-frontend/     # React + TypeScript frontend (THE canonical client)
├── backend/             # C++17 WebSocket server (THE canonical server)
├── protocol/            # JSON schema definitions for all messages
├── docs/                # Game design, architecture, protocol docs, implementation logs
├── tests/               # Top-level test directory (canonical location for new tests)
├── scripts/             # Build and deployment shell scripts
├── docker-compose.yml        # Dev container setup
├── docker-compose-prod.yml   # Production with Traefik + TLS
├── AGENTS.md            # AI agent instructions and project principles
└── README.md            # Public-facing project README
```

---

## Frontend Directory Structure (`stitch-frontend/src/`)

```
src/
├── main.tsx                        # App root; manages 3 game phases (login → lobby → play)
├── components/
│   ├── CodenameAuthorizationTerminal/   # Phase 1: Login screen (codename input)
│   │   ├── CodenameAuthorizationTerminal.tsx
│   │   └── CodenameAuthorizationTerminal.css
│   ├── MissionDeploymentHub/            # Phase 2: Lobby (create/join match)
│   │   ├── MissionDeploymentHub.tsx
│   │   └── MissionDeploymentHub.css
│   ├── PhaserGame/                      # Phase 3: Main game (SVG map + HUD + actions)
│   │   ├── PhaserGame.tsx               # 800+ line core game component
│   │   ├── HowToPlayOverlay.tsx         # Tutorial modal
│   │   └── PhaserGame.css
│   ├── SecureLinkFrequency/             # Frequency code entry modal
│   ├── SurveillanceCommandCenterGlobal/ # (not in active main flow)
│   ├── SurveillanceCommandCenterGlobalMap/
│   └── WorldMapCanvas/
├── network/
│   ├── WebSocketClient.ts              # WebSocket wrapper with event emitter
│   └── EventEmitter.ts                 # Custom pub/sub system
├── types/
│   └── Messages.ts                     # ALL shared types, enums, interfaces
└── styles/
    └── index.css                       # Global styles, Tailwind imports, animations
```

---

## Backend Directory Structure (`backend/`)

```
backend/
├── include/
│   ├── game/
│   │   ├── GameState.hpp      # Core game logic (pure, no I/O)
│   │   ├── Match.hpp          # Binds two players + GameState
│   │   ├── MatchManager.hpp   # Lobby: creates and tracks matches
│   │   ├── Player.hpp         # PlayerData struct
│   │   └── CityGraph.hpp      # Map adjacency graph
│   ├── network/
│   │   ├── WebSocketServer.hpp  # TCP listener + WebSocket upgrade
│   │   └── Session.hpp          # Per-connection state and I/O
│   ├── protocol/
│   │   └── Messages.hpp         # Message parsing and serialization
│   └── config/
│       ├── AbilityCosts.hpp     # Ability Intel costs (single source of truth)
│       └── DefaultMap.hpp       # Game board definition
├── src/
│   ├── main.cpp               # Entry point: starts server on port 8085
│   ├── game/                  # Implementations matching headers above
│   ├── network/
│   └── protocol/
├── tests/
│   ├── unit/
│   │   ├── test_game_state.cpp
│   │   ├── test_match_auto_end_turn.cpp
│   │   └── test_match_timeout.cpp
│   ├── test_map.hpp            # Shared test fixture (deterministic map)
│   └── CMakeLists.txt
└── CMakeLists.txt
```

---

## Application Flow (3 Phases)

```
[Browser Open]
      │
      ▼
┌─────────────────────────┐
│  Phase 1: Login         │
│  CodenameAuthorization  │  ← user enters codename → sends SET_PLAYER_NAME
│  Terminal               │
└───────────┬─────────────┘
            │ (name set, move to lobby)
            ▼
┌─────────────────────────┐
│  Phase 2: Lobby         │
│  MissionDeploymentHub   │  ← CREATE_MATCH or JOIN_MATCH
└───────────┬─────────────┘
            │ (MATCH_START received)
            ▼
┌─────────────────────────┐
│  Phase 3: Game          │
│  PhaserGame             │  ← MATCH_STATE, PLAYER_ACTION, GAME_OVER
└─────────────────────────┘
```

---

## Key Files at a Glance

| File | What to edit when... |
|---|---|
| `stitch-frontend/src/types/Messages.ts` | Adding new message types, action kinds, or state fields |
| `stitch-frontend/src/components/PhaserGame/PhaserGame.tsx` | Changing game UI, city map interactions, HUD, action buttons |
| `stitch-frontend/src/network/WebSocketClient.ts` | Changing WebSocket connection or event routing |
| `stitch-frontend/src/main.tsx` | Changing phase transitions or WebSocket event handling |
| `backend/include/game/GameState.hpp` + `.cpp` | Adding/changing game rules, actions, or turn logic |
| `backend/include/game/Player.hpp` | Adding new player state fields |
| `backend/include/game/Match.hpp` + `.cpp` | Changing match lifecycle, turn timer, broadcasting |
| `backend/include/protocol/Messages.hpp` + `.cpp` | Changing what gets serialized in MATCH_STATE |
| `backend/include/config/AbilityCosts.hpp` | Rebalancing ability Intel costs |
| `backend/include/config/DefaultMap.hpp` | Changing the game map (cities/edges) |

---

## UI Aesthetic (Aegis Terminal)

The visual theme is a **cyberpunk tactical command center**:
- **Background**: Near-black (`#0c0e0f`)
- **Primary accent**: Cyan (`#c1fffe` / `#00ffff`)
- **Secondary accent**: Amber/Orange (`#fe9800`)
- **Error/danger**: Red (`#ff716c`)
- **Typography**: `Space Grotesk` (headlines) + `JetBrains Mono` (data/logs)
- **Effects**: Scanline overlays, neon glow, animated pulses

Always follow this aesthetic when implementing new UI. See `AGENTS.md §18` and use the `ui-style` skill.

---

## Documentation Map

| Document | Contents |
|---|---|
| `.github/CODEBASE_GUIDE.md` (this file) | Project overview, tech stack, structure |
| `.github/ARCHITECTURE.md` | System architecture, component diagram, message flow |
| `.github/GAME_MECHANICS.md` | Full game rules, turn structure, abilities, map data |
| `.github/PROTOCOL.md` | All WebSocket message types, payloads, examples |
| `.github/DATA_MODELS.md` | TypeScript interfaces + C++ structs |
| `.github/DEVELOPMENT.md` | Build, dev workflow, testing, deployment |
| `.github/CONVENTIONS.md` | Code style, naming conventions, security rules |
| `AGENTS.md` | AI agent principles and design rules (canonical) |
| `docs/game_design/game_design_doc.md` | Canonical game design spec |
| `docs/architecture.md` | High-level architecture diagram |
| `docs/protocol/INTEGRATION_GUIDE.md` | Full client-server integration walkthrough |
