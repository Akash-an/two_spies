# Architecture Overview

> **⚠️ NOTE: As of 2026-04, all references to "frontend" in this document mean `stitch-frontend/`. The older `frontend/` directory is deprecated and no longer used.**

## System Components

```
Browser (Client) — stitch-frontend/
  └── React UI (menus, lobby, settings)
  └── Phaser 3 canvas (game rendering)
  └── WebSocketClient (browser native API)
         │  JSON messages over WSS
         ▼
C++ WebSocket Server (Boost.Beast + Asio)
  └── WebSocketServer   — accept & manage connections
  └── SessionManager    — isolated per-match rooms
  └── GameRules         — authoritative state transitions
  └── ProtocolParser    — message validation & serialization
```

## Message Flow

```
Client (stitch-frontend/)      Server (backend/)
  │── LOBBY_JOIN ─────────────▶  │
  │◀─ BOARD_STATE_UPDATE ───────  │ (initial board)
  │                               │
  │── PLAYER_MOVE ─────────────▶  │
  │                               │ (validate → apply → broadcast)
  │◀─ BOARD_STATE_UPDATE ───────  │
  │◀─ TURN_CHANGE ──────────────  │
  │                               │
  │── PLAYER_END_TURN ──────────▶ │
  │◀─ TURN_CHANGE ──────────────  │
  │                               │
  │◀─ GAME_OVER ────────────────  │ (when a flag is captured)
```

## Directory Layout

| Path | Purpose |
|---|---|
| `stitch-frontend/src/components/` | React components (UI overlays, modals) |
| `stitch-frontend/src/network/` | WebSocket client wrapper |
| `stitch-frontend/src/types/` | Message types (ClientMessageType, ServerMessageType) |
| `stitch-frontend/src/styles/` | Global CSS and Tailwind |
| `backend/src/game/` | Rules engine, state machine |
| `backend/src/network/` | WebSocket server, session handling |
| `backend/src/protocol/` | Message parsing and serialization |
| `backend/include/` | Public C++ headers |
| `protocol/schemas/` | JSON Schema definitions (source of truth) |

## Key Design Decisions

- **Authoritative server**: All game state lives on the server. Clients (stitch-frontend/) are pure views.
- **JSON protocol**: Human-readable for development; can be replaced with binary for production performance.
- **React + Phaser**: stitch-frontend uses React for overlays and menus; Phaser embedded in a React component for the game canvas.
- **Per-session rooms**: Each active match is an isolated room object on the server, making horizontal scaling straightforward.
