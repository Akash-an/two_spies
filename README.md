# Two Spies

# Two Spies

A browser-based multiplayer strategy game of espionage. Two players move secretly between connected cities, gather intelligence, and try to locate and eliminate the opponent's spy.

**Tech Stack:**
- **stitch-frontend:** React 18 + TypeScript + Tailwind CSS (stitch-frontend/) — **canonical client**
- **Backend:** C++17 + Boost.Asio/Beast WebSocket server
- **Protocol:** JSON over WebSocket
- **Architecture:** Server-authoritative, turn-based, deterministic

> ⚠️ **IMPORTANT: "frontend" now always refers to `stitch-frontend/`. The older `frontend/` directory is **DEPRECATED** and must not be used.**

## Monorepo Structure

```
two_spies/
├── stitch-frontend/              # React + Tailwind game client (main client, replaces old frontend/)
│   ├── src/
│   │   ├── components/    # React components (organized by feature)
│   │   ├── network/       # WebSocket client
│   │   ├── types/         # Message types
│   │   └── styles/        # Global styles
│   ├── screenshots/       # Testing assets
│   ├── package.json
│   └── vite.config.ts
├── frontend/              # ⚠️ DEPRECATED — do not use. Use stitch-frontend instead.
├── backend/               # C++ WebSocket server
│   ├── include/
│   │   ├── game/          # GameState, Match, CityGraph
│   │   ├── network/       # WebSocketServer, Session
│   │   ├── protocol/      # Message serialization
│   │   └── config/        # DefaultMap
│   ├── src/
│   ├── tests/
│   ├── CMakeLists.txt
│   └── build/
├── protocol/              # Shared JSON schemas
├── docs/
│   ├── architecture.md
│   └── game_design/
│       └── game_design_doc.md
├── tests/                 # Canonical test location (per AGENTS.md policy)
├── AGENTS.md              # AI agent behavior rules
└── Requirements.md        # Technical specification

## Prerequisites

### macOS (Homebrew)
```bash
# C++ build tools
brew install cmake boost nlohmann-json openssl

# Node.js for stitch-frontend
brew install node
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install cmake libboost-dev nlohmann-json3-dev libssl-dev
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install nodejs
```

### Windows (MSVC + vcpkg)
```bash
# Install Visual Studio 2019+ with C++ workload
# Install vcpkg, then:
vcpkg install boost nlohmann-json openssl
```

## Backend Setup & Run

### 1. Configure CMake
```bash
cd backend
mkdir -p build
cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
```

**On macOS with M1/M2:**
```bash
cmake .. -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=arm64
```

### 2. Build
```bash
cmake --build . -j$(nproc)  # Unix-like
# OR
cmake --build . -j8         # macOS without nproc
```

### 3. Run Tests (optional)
```bash
ctest --output-on-failure
```

All 9 GameState unit tests should pass:
```
test_starting_cities... OK
test_move_valid... OK
test_move_not_adjacent... OK
test_move_wrong_turn... OK
test_strike_hit... OK
test_strike_miss... OK
test_end_turn... OK
test_no_actions_remaining... OK
test_city_graph_adjacency... OK
```

### 4. Start the Server
```bash
./two_spies_server 8085 4
```

Args: `<port> <thread_count>`

Output:
```
[two_spies] Starting WebSocket server on port 8085 (4 threads)
[Server] Listening on port 8085
```

Server is now listening at `ws://localhost:8085`

---

## Docker Support (Recommended)

You can run the entire stack (backend + stitch-frontend) using Docker and Docker Compose. This ensures all dependencies are correctly configured.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start
The project provides two Docker Compose configurations:

**Development Mode** (Direct port access):
```bash
./scripts/docker-run.sh
```
- **Frontend:** http://localhost:5173
- **Backend:** ws://localhost:8085

**Production Mode** (Traefik + SSL):
```bash
docker compose -f docker-compose-prod.yml up -d
```
- **URL:** https://spies.atyourservice-ai.com
- **Traefik Dashboard:** http://localhost:8081

Logs can be viewed with `docker compose logs -f`.

---

## stitch-frontend Setup & Run

### 1. Install Dependencies
```bash
cd stitch-frontend
npm install
```

### 2. Configure Backend URL (optional)
Edit [stitch-frontend/src/main.tsx](stitch-frontend/src/main.tsx):
```typescript
const USE_REAL_SERVER = true;        // true = connect to C++ backend
const WS_URL = 'ws://localhost:8085'; // backend URL
```

Set to `false` to use the in-browser mock server (single-player simulation).

### 3. Type-Check (optional)
```bash
npm run build  # also generates dist/ for production
npx tsc --noEmit
```

### 4. Start Development Server
```bash
npm run dev
```

Output:
```
  VITE v5.4.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

Open http://localhost:5173 in your browser.

---

## Multiplayer Testing

### Single Machine, Two Browsers

**Terminal 1 — Backend:**
```bash
cd backend/build
./two_spies_server 8085
```

**Terminal 2 — stitch-frontend:**
```bash
cd stitch-frontend
npm run dev
```

**Browsers:**
1. Open http://localhost:5173 in **Browser #1**
2. Open http://localhost:5173 in **Browser #2** (or same browser, different tab)
3. Click **"FIND MATCH"** in both → they will pair and start
4. Play the game (take turns moving, striking, using abilities)

### Network Play (Remote)

**On Machine A (Backend):**
```bash
cd backend/build
./two_spies_server 0.0.0.0 8085  # listen on all interfaces
```

**On Machine B (stitch-frontend):**
```bash
cd stitch-frontend
# Edit src/main.tsx to use Machine A's IP:
# const WS_URL = 'ws://machine-a-ip:8085';
npm run dev
```

---

## Development Workflow

### Code Organization

**Game Logic** (C++ Backend)
- [GameState.hpp](backend/include/game/GameState.hpp) — core rules engine
- [CityGraph.hpp](backend/include/game/CityGraph.hpp) — map adjacency
- [Match.hpp](backend/include/game/Match.hpp) — two-player session
- [MatchManager.hpp](backend/include/game/MatchManager.hpp) — matchmaking

**Networking** (C++ Backend)
- [WebSocketServer.hpp](backend/include/network/WebSocketServer.hpp) — listener
- [Session.hpp](backend/include/network/Session.hpp) — per-connection handler
- [Messages.hpp](backend/include/protocol/Messages.hpp) — JSON serialization

**stitch-frontend UI** (TypeScript + React)
- [SurveillanceCommandCenterGlobal.tsx](stitch-frontend/src/components/SurveillanceCommandCenterGlobal/SurveillanceCommandCenterGlobal.tsx) — main game interface
- [CodenameAuthorizationTerminal.tsx](stitch-frontend/src/components/CodenameAuthorizationTerminal/CodenameAuthorizationTerminal.tsx) — name entry
- [WebSocketClient.ts](stitch-frontend/src/network/WebSocketClient.ts) — real server connection

### Making Changes

**Game Rules (Backend):**
1. Update [GameState.cpp](backend/src/game/GameState.cpp)
2. Update [backend/tests/unit/test_game_state.cpp](backend/tests/unit/test_game_state.cpp)
3. Rebuild and test:
   ```bash
   cd backend/build
   cmake --build . && ctest --output-on-failure
   ```

**UI/Scenes (stitch-frontend):**
1. Edit TypeScript/React files in [stitch-frontend/src/](stitch-frontend/src/)
2. Changes hot-reload automatically in dev mode
3. Check for type errors: `npm run build`

**Message Protocol:**
1. Update enum/struct in [Messages.ts](stitch-frontend/src/types/Messages.ts) (stitch-frontend)
2. Update enum/struct in [Messages.hpp](backend/include/protocol/Messages.hpp) (backend)
3. Update parser in [Messages.cpp](backend/src/protocol/Messages.cpp)

---

## Common Issues

### Backend won't compile (CMake errors)
```bash
# Boost 1.90+ is header-only for system
# If you still see boost_system errors, update your Boost:
brew upgrade boost
# OR manually set:
cmake .. -CMAKE_PREFIX_PATH=/opt/homebrew/opt/boost
```

### stitch-frontend won't connect to backend
- Ensure backend is running: `ps aux | grep two_spies_server`
- Check port 8085 is listening: `lsof -i :8085`
- Verify `WS_URL` in [main.tsx](stitch-frontend/src/main.tsx) is correct
- Check browser console for errors (F12 → Console tab)

### "Match not full" / "Not in a match" errors
- This means the session handshake didn't complete. Check server logs.
- Try refreshing the browser or restarting the server.

### Port already in use
```bash
# Kill existing server
lsof -i :8085 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

---

## Documentation

### Architecture & Design
- [AGENTS.md](AGENTS.md) — architecture rules for AI agents
- [Architecture](docs/architecture.md) — system design (WIP)
- [Game Design Doc](docs/game_design/game_design_doc.md) — rules, abilities, turn structure
- [Requirements](Requirements.md) — feature specification

### Protocol & Integration (Backend ↔ stitch-frontend)
- **[Protocol Documentation Index](docs/protocol/README.md)** — choose the right reference for your task
- [Backend ↔ stitch-frontend Interactions](docs/protocol/backend-stitch-frontend-interactions.md) — complete message reference
- [Quick Reference](docs/protocol/QUICK_REFERENCE.md) — message tables, quick lookup
- [Integration Guide](docs/protocol/INTEGRATION_GUIDE.md) — detailed flows and code examples

---

## Build Artifacts

**Backend:**
- `backend/build/two_spies_server` — executable
- `backend/build/tests/unit_tests` — unit tests
- `backend/build/libtwo_spies_lib.a` — game logic library

**stitch-frontend (the one to use):**
- `stitch-frontend/dist/` — production build (run `npm run build`)

**frontend/ (DEPRECATED):**
- ⚠️ Do NOT use. This old directory is kept for reference only and will be removed in a future release.
- All active development uses `stitch-frontend/`.

---

## Next Steps

**Phase 2 — Basic Match Flow** (in progress)
- ✅ WebSocket connection
- ✅ JSON message parsing
- ✅ Two-player matchmaking

**Phase 3 — Core Mechanics**
- Movement validation
- Strike logic
- Turn enforcement
- Intel resource

**Phase 4 — Hidden Information**
- Per-player state filtering
- Cover system
- Ability effects

**Phase 5 — Production Hardening**
- Reconnection logic
- Error handling
- WSS (secure WebSocket)
- Input validation
