# Quick Start — Two Spies

Get the game running in 5 minutes.

## One-Time Setup

### macOS
```bash
brew install cmake boost nlohmann-json openssl node
```

### Linux (Ubuntu)
```bash
sudo apt-get install cmake libboost-dev nlohmann-json3-dev libssl-dev nodejs
```

---

## Run Backend

```bash
cd backend
mkdir -p build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .
./two_spies_server 8080 4
```

✅ Server listening on `ws://localhost:8080`

---

## Run stitch-frontend

**New terminal:**
```bash
cd stitch-frontend
npm install
npm run dev
```

✅ Open http://localhost:5173 in your browser

---

## Play

1. Open http://localhost:5173 in **two separate browser tabs**
2. Click **"FIND MATCH"** in each tab
3. Game starts automatically when both players are ready

---

## Test Backend (Optional)

```bash
cd backend/build
ctest --output-on-failure
```

All 9 GameState unit tests should pass.
