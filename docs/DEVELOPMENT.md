# Development & Getting Started — Two Spies

This guide covers everything from your first time running the game to deep development workflows.

---

## 🐋 Docker Setup (Recommended)

The easiest way to run the full stack (backend + frontend) is using Docker.

### Development Mode
```bash
./scripts/docker-rebuild.sh
./scripts/docker-run.sh
```
- **Frontend:** http://localhost:5173
- **Backend:** ws://localhost:8085

### Production Mode (Traefik + SSL)
```bash
# Rebuild and start
./scripts/docker-rebuild.sh --prod

# Start existing
./scripts/docker-run.sh --prod
```
✅ Host: `https://spies.atyourservice-ai.com`

---

## 🚀 Native Quick Start (5 Minutes)

If you prefer to run services natively on your host machine.

### 1. One-Time Setup
**macOS:** `brew install cmake boost nlohmann-json openssl node`
**Linux:** `sudo apt-get install cmake libboost-dev nlohmann-json3-dev libssl-dev nodejs`

### 2. Run Backend
```bash
cd backend
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .
./two_spies_server 8085 4
```

### 3. Run stitch-frontend
**New terminal:**
```bash
cd stitch-frontend
npm install
npm run dev
```
✅ Open **http://localhost:5173** in two separate browser tabs and click **"FIND MATCH"** in both.

---

## 🛠 Detailed Development Setup

### Prerequisites
Detailed package information for different environments.

#### macOS (Homebrew)
```bash
# C++ build tools
brew install cmake boost nlohmann-json openssl

# Node.js for stitch-frontend
brew install node
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install cmake libboost-dev nlohmann-json3-dev libssl-dev
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install nodejs
```

---

## Backend Deep Dive

### Build Configurations
- **Release:** `cmake .. -DCMAKE_BUILD_TYPE=Release` (Recommended for play)
- **Debug:** `cmake .. -DCMAKE_BUILD_TYPE=Debug` (For development)

**Apple Silicon (M1/M2) Note:**
```bash
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES=arm64
```

### Running Tests
```bash
cd backend/build
ctest --output-on-failure
```

---

## stitch-frontend Deep Dive

### Configuration
Configuration is managed via environment variables. Create a `.env` file in `stitch-frontend/` (or edit the root `.env` if using Docker):
```bash
VITE_WS_URL=ws://localhost:8085
```
The client uses this URL to establish the WebSocket connection to the backend.

### Type-Checking & Linting
```bash
cd stitch-frontend
npx tsc --noEmit
```

---

## 🏗 Development Workflow

### Code Organization
- `backend/include/game/`: Core rules engine, map adjacency, match logic.
- `backend/include/network/`: WebSocket listeners and session handlers.
- `stitch-frontend/src/components/`: React UI components.
- `stitch-frontend/src/network/`: WebSocket client implementation.

### Making Changes
1. **Game Rules:** Modify `backend/src/game/GameState.cpp`, update unit tests, and rebuild.
2. **UI:** Edit `stitch-frontend/src/`. Changes hot-reload automatically.
3. **Protocol:** Update `Messages.hpp` (backend) and `Messages.ts` (frontend).

---

## 🔍 Troubleshooting

### Backend compilation fails
- Ensure Boost, OpenSSL, and nlohmann-json are installed.
- Check `CMakeCache.txt` if paths are wrong.

### Frontend won't connect
- Verify backend is running on the expected port (default 8085).
- Check browser console for WebSocket errors.

### Port already in use
```bash
lsof -i :8085 | grep LISTEN | awk '{print $2}' | xargs kill -9
```
