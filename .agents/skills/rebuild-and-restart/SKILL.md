---
name: rebuild-and-restart
description: >-
  Instructions and scripts for recompiling and restarting the Two Spies backend
  (C++) and/or stitch-frontend (Vite/TypeScript) after code changes. Trigger: rebuild,
  recompile, restart server, restart stitch-frontend, apply backend changes, hot reload,
  build failed, compile error, restart dev server.
---


# Rebuild & Restart — Two Spies

Scripts live in `scripts/` at the project root. Always use these instead of running build commands manually to ensure the old process is stopped cleanly.

---

## Scripts Overview

| Script | What it does |
|---|---|
| `scripts/rebuild-backend.sh` | Stop server → recompile C++ → restart server |
| `scripts/rebuild-stitch-frontend.sh` | Stop Vite → type-check → restart `npm run dev` |
| `scripts/rebuild-all.sh` | Runs both scripts in sequence |

All scripts must be executable. If they are not, run once:

```bash
chmod +x scripts/rebuild-backend.sh scripts/rebuild-stitch-frontend.sh scripts/rebuild-all.sh
```

---

## Backend — After changing C++ code

```bash
bash scripts/rebuild-backend.sh
# Optional: specify port and max-player-slots
bash scripts/rebuild-backend.sh 8080 4
```

**What it does, step by step:**

1. Kills any running `two_spies_server` process (`pkill -f two_spies_server`).
2. Runs `cmake --build backend/build --parallel` (incremental, only recompiles changed TUs).
3. Restarts `two_spies_server <port> <max_players>` in the background.
4. Writes the new PID to `backend/build/server.pid`.
5. Streams server logs to `backend/server.log`.

**If cmake is not yet configured** (first time or after deleting `build/`):

```bash
mkdir -p backend/build
cmake -S backend -B backend/build -DCMAKE_BUILD_TYPE=Release
bash scripts/rebuild-backend.sh
```

---

## stitch-frontend (stitch-stitch-frontend) — After changing TypeScript/React code

```bash
bash scripts/rebuild-stitch-frontend.sh
```

**What it does, step by step:**

1. Kills any running `vite` process in `stitch-stitch-frontend/`.
2. Checks for `node_modules/`; runs `npm install` if missing.
3. Runs `tsc --noEmit` — **fails fast** if TypeScript errors exist.
4. Starts `npm run dev` (Vite) in the background on port 5173.
5. Streams Vite logs to `stitch-stitch-frontend/vite.log`.

> **Note:** Vite has Hot Module Replacement (HMR). For most TypeScript/React changes you do **not** need to restart—the browser updates automatically. Only restart if you change `vite.config.ts`, environment variables, or Vite plugins.

---

## Rebuild Everything

```bash
bash scripts/rebuild-all.sh
```

Rebuilds backend then stitch-frontend. Pass a custom port as first argument:

```bash
bash scripts/rebuild-all.sh 9090
```

---

## Checking Logs

```bash
# Backend logs (live)
tail -f backend/server.log

# stitch-frontend logs (live)
tail -f stitch-stitch-frontend/vite.log
```

---

## Stopping Services Manually

```bash
# Stop backend
pkill -f two_spies_server

# Stop stitch-frontend
pkill -f vite

# Or use saved PIDs
kill $(cat backend/build/server.pid)
kill $(cat stitch-stitch-frontend/.vite.pid)
```

---

## Common Issues

| Symptom | Fix |
|---|---|
| `cmake --build` fails | Check compile errors in terminal; fix C++ source then re-run script |
| TypeScript errors block stitch-frontend restart | Run `npx tsc --noEmit` to see all errors; fix before restarting |
| Port already in use | Run `lsof -i :8080` to find the process and kill it |
| `node_modules` out of date after `package.json` change | Delete `stitch-stitch-frontend/node_modules` and re-run the stitch-frontend rebuild script |
| Build directory missing | Delete `backend/build` and re-run with the cmake init step above |
