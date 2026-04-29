# Two Spies — Development Guide

> How to build, run, test, and deploy the project.

---

## Prerequisites

### Native Development
| Tool | Minimum Version | Purpose |
|---|---|---|
| Node.js | 18+ | Frontend dev server and build |
| npm | 9+ | Package management |
| CMake | 3.16+ | Backend build system |
| C++ compiler | C++17 support (GCC 9+ / Clang 10+ / MSVC 2019+) | Backend |
| Boost | 1.74+ | Asio + Beast (Asio/Beast header-only subset) |
| OpenSSL | 1.1+ | WSS support |

### Docker Development (Recommended)
- Docker + Docker Compose
- No other dependencies required

---

## Quick Start (Docker — Recommended)

```bash
# 1. Clone and enter the repo
git clone <repo-url> && cd two_spies

# 2. Build images (only needed on first run or after major changes)
./scripts/docker-rebuild.sh

# 3. Start services
./scripts/docker-run.sh

# 4. Open your browser
# Frontend: http://localhost:5173
# Backend WebSocket: ws://localhost:8085
```

To stop:
```bash
./scripts/docker-stop.sh
```

---

## Quick Start (Native)

### Backend

```bash
cd backend
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)

# Run the server (port 8085, 4 worker threads)
./two_spies_server 8085 4
```

### Frontend

```bash
cd stitch-frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## Build Scripts

All scripts live in `scripts/` at the project root.

| Script | When to use |
|---|---|
| `scripts/rebuild-backend.sh` | After any C++ source change |
| `scripts/rebuild-frontend.sh` | After `vite.config.ts`, env var, or plugin changes (HMR handles `.tsx/.ts` changes automatically) |
| `scripts/rebuild-all.sh` | Full rebuild of both services |
| `scripts/docker-run.sh` | Start services with Docker Compose |
| `scripts/docker-rebuild.sh` | Rebuild Docker images and restart |
| `scripts/docker-stop.sh` | Stop Docker Compose services |

---

## Frontend Commands

```bash
cd stitch-frontend

npm run dev        # Vite dev server with HMR — http://localhost:5173
npm run build      # TypeScript type check + production Vite build → dist/
npm run preview    # Serve the production build locally → http://localhost:4173
```

**TypeScript check only (no emit):**
```bash
npx tsc --noEmit
```

**IMPORTANT**: There are no compiled `.js` files in `src/`. Always edit `.tsx` / `.ts` source files. `tsconfig.json` has `noEmit: true`.

---

## Backend Commands

```bash
cd backend/build

# Debug build (symbols, no optimization, useful for local testing)
cmake .. -DCMAKE_BUILD_TYPE=Debug
cmake --build .

# Release build (optimized, for production)
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .

# Run
./two_spies_server <port> <threads>
# e.g. ./two_spies_server 8085 4
```

---

## Running Tests

### Backend Unit Tests

```bash
cd backend/build
cmake --build .
ctest --output-on-failure    # Run all tests
ctest -V                      # Verbose output
```

Test files:
- `backend/tests/unit/test_game_state.cpp` — GameState logic
- `backend/tests/unit/test_match_auto_end_turn.cpp` — Auto end-of-turn behavior
- `backend/tests/unit/test_match_timeout.cpp` — Turn timer timeout handling
- `backend/tests/test_map.hpp` — Shared deterministic map fixture

### Frontend E2E Tests (Playwright)

```bash
cd stitch-frontend
npx playwright test                  # Run all e2e tests
npx playwright test --headed         # Run with visible browser
npx playwright show-report           # Show test report
```

---

## Log Locations

When debugging, **always check logs first**:

| Service | Log location |
|---|---|
| Backend | `backend/server.log` |
| Frontend (Vite) | `stitch-frontend/vite.log` |

When a user reports a bug:
1. Read the relevant log file
2. Identify errors, stack traces, or warnings
3. Determine root cause before proposing solutions
4. After fixing, verify errors are gone from logs

---

## Environment Configuration

### Frontend WebSocket URL

The frontend WebSocket URL is configured via the `VITE_WS_URL` environment variable:

```bash
# .env.local (not committed)
VITE_WS_URL=ws://localhost:8085

# Production (relative URL — auto-upgrades to current host + wss://)
VITE_WS_URL=/ws
```

If `VITE_WS_URL` is not set, the frontend defaults to `ws://localhost:8085`.

### Backend Port

Configured at runtime:
```bash
./two_spies_server <port> <thread_count>
```

Default: port `8085`, 4 threads.

---

## Production Deployment

### Docker Compose (Prod)

```bash
# Uses docker-compose-prod.yml
./scripts/docker-rebuild.sh --prod
./scripts/docker-run.sh --prod
```

Production stack:
- **Traefik** reverse proxy with TLS termination
- **Domain**: `spies.atyourservice-ai.com`
- Frontend served from built `dist/` via static file server
- Backend on WSS (WebSocket Secure) proxied through Traefik

### Manual Production Build

```bash
# Backend
cd backend
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .

# Frontend
cd stitch-frontend
npm run build
# Serve dist/ with any static file server (nginx, serve, etc.)
```

---

## Development Workflow (AI Agents)

When making code changes, follow this workflow:

### Frontend changes (`.tsx` / `.ts`)
1. Edit source files — Vite's HMR auto-reloads in the browser
2. No rebuild needed for most changes
3. Run `npm run build` to verify TypeScript compiles clean before committing

### Frontend config changes (`vite.config.ts`, `.env`, plugins)
1. Edit the file
2. Run `./scripts/rebuild-frontend.sh` to restart Vite

### Backend changes (`.hpp` / `.cpp`)
1. Edit source files
2. Run `./scripts/rebuild-backend.sh` to recompile and restart the server

### Protocol changes (new message types, state fields)
1. Update `stitch-frontend/src/types/Messages.ts` (TypeScript side)
2. Update `backend/include/protocol/Messages.hpp` (C++ constants)
3. Update `backend/src/protocol/Messages.cpp` (serialize/parse logic)
4. Update `protocol/schemas/` JSON schema files
5. Rebuild backend: `./scripts/rebuild-backend.sh`
6. Verify TypeScript: `cd stitch-frontend && npx tsc --noEmit`

---

## Vite Config

```typescript
// stitch-frontend/vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,          // dev server port
  },
  build: {
    outDir: 'dist',      // production output
  },
  preview: {
    port: 4173,          // preview server port
  },
})
```

---

## CMake Config Summary

```cmake
# backend/CMakeLists.txt
cmake_minimum_required(VERSION 3.16)
project(TwoSpies)

set(CMAKE_CXX_STANDARD 17)

# Dependencies: Boost, OpenSSL, nlohmann_json, Threads

# two_spies_lib: static library (game logic + protocol — no networking)
# two_spies_server: executable (links two_spies_lib + networking)

# Tests: separate target linking two_spies_lib
```

---

## Tailwind Config

```javascript
// stitch-frontend/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary:     '#c1fffe',  // cyan
        'primary-dim': '#00e6e6',
        secondary:   '#fe9800',  // amber/orange
        surface:     '#0c0e0f',  // near-black background
        'on-surface': '#f6f6f7', // off-white text
        error:       '#ff716c',  // red
        outline:     '#747577',  // gray
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        body:    ['Inter', 'sans-serif'],
      },
    },
  },
}
```
