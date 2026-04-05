# Architecture Overview

## System Components

```
Browser (Client)
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
Client                          Server
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
| `stitch-frontend/src/game/` | Phaser scenes, entities, game config |
| `stitch-frontend/src/ui/` | React components, pages, hooks |
| `stitch-frontend/src/network/` | WebSocket client wrapper |
| `backend/src/game/` | Rules engine, state machine |
| `backend/src/network/` | WebSocket server, session handling |
| `backend/src/protocol/` | Message parsing and serialization |
| `backend/include/` | Public C++ headers |
| `protocol/schemas/` | JSON Schema definitions (source of truth) |

## Key Design Decisions

- **Authoritative server**: All game state lives on the server. Clients are pure views.
- **JSON protocol**: Human-readable for development; can be replaced with binary for production performance.
- **Phaser embedded in React**: Phaser mounts into a `<div>` managed by React; React overlays handle all non-game UI.
- **Per-session rooms**: Each active match is an isolated room object on the server, making horizontal scaling straightforward.
