# Two Spies — Conventions & Patterns

> Code style, naming conventions, design patterns, and security rules that all contributions must follow.

---

## Core Principles

1. **Server is the single source of truth.** The client never computes outcomes; it only sends intents.
2. **No cross-layer leakage.** Game logic never depends on network code. UI never computes game outcomes.
3. **Deterministic game logic.** `GameState` is pure and has no I/O, no timers, no randomness except explicit seeded operations.
4. **Validate everything on the server.** Never trust client input.
5. **Clarity over cleverness.** Readable code first. Optimize only when measured.

---

## Frontend Conventions (TypeScript / React)

### File Structure
- Each component lives in its own folder: `ComponentName/ComponentName.tsx` + `ComponentName.css`
- One component per folder; co-located styles in the same folder
- Shared types in `src/types/Messages.ts` — do NOT scatter type definitions in component files
- All WebSocket interaction goes through `src/network/WebSocketClient.ts` — never use raw `WebSocket` in components

### Naming
| Construct | Convention | Example |
|---|---|---|
| Components | PascalCase | `PhaserGame`, `MissionDeploymentHub` |
| Props interfaces | PascalCase + `Props` suffix | `PhaserGameProps` |
| Hooks | camelCase + `use` prefix | `useGameState` |
| Utility functions | camelCase | `computeTimerDisplay` |
| Enums | UPPER_CASE values | `ClientMessageType.SET_PLAYER_NAME` |
| CSS classes | kebab-case | `.game-container`, `.city-circle` |
| Files | PascalCase for components, camelCase for utils | `PhaserGame.tsx`, `webSocketHelpers.ts` |

### TypeScript Rules
- Strict mode enabled — no `@ts-ignore` without a comment explaining why
- Never use `any` — use `unknown` + type narrowing when type is genuinely unknown
- No mutable shared state outside React state/context
- All message types must use `ClientMessageType` / `ServerMessageType` enums — no raw strings
- Prefer `interface` over `type` for object shapes; use `type` for unions and aliases

### React Patterns
- Functional components with hooks (no class components)
- Lift state to the appropriate level — game state lives in `main.tsx`, local UI state lives in the component
- Use `useCallback` for stable function references passed as props
- Use `useRef` for mutable values that do not trigger re-renders (timers, WebSocket references)
- Do not add event listeners without cleanup (`useEffect` cleanup function)

### Sending WebSocket Messages
```typescript
// CORRECT — always use enums
client.send(ClientMessageType.PLAYER_ACTION, {
  action: ActionKind.MOVE,
  targetCity: 'london',
});

// WRONG — never use raw strings
client.send('PLAYER_ACTION', { action: 'MOVE', targetCity: 'london' });
```

### Receiving WebSocket Messages
```typescript
// CORRECT — register in useEffect with cleanup
useEffect(() => {
  const handler = (msg: ServerMessage) => { /* ... */ };
  client.on(ServerMessageType.MATCH_STATE, handler);
  return () => client.off(ServerMessageType.MATCH_STATE, handler);
}, [client]);
```

### CSS / Styling
- Use Tailwind utility classes for layout and spacing
- Use component `.css` files for complex, reusable styles and animations
- Follow the **Aegis Terminal** aesthetic: dark backgrounds, cyan primary, amber secondary
- Animations defined in `src/styles/index.css` (keyframes, reusable animation classes)
- Never use inline styles for anything that could be a CSS class

---

## Backend Conventions (C++17)

### File Structure
- Headers in `include/`, implementations in `src/` — mirror the folder structure exactly
- Header guards: `#pragma once` (not `#ifndef` guards)
- One class per header file

### Namespaces
| Layer | Namespace |
|---|---|
| Game logic | `two_spies::game` |
| Networking | `two_spies::network` |
| Protocol | `two_spies::protocol` |
| Configuration | `two_spies::config` |

### Naming
| Construct | Convention | Example |
|---|---|---|
| Classes | PascalCase | `GameState`, `MatchManager` |
| Methods | snake_case | `are_adjacent()`, `handle_action()` |
| Member variables | snake_case with trailing `_` | `state_`, `player_id_` |
| Constants / enums | UPPER_CASE | `TURN_DURATION_MS`, `AbilityId::LOCATE` |
| Local variables | snake_case | `target_city`, `action_result` |

### C++ Best Practices
- Use `std::shared_ptr` / `std::unique_ptr` — avoid raw owning pointers
- Use RAII — resources released in destructors, not manual cleanup
- Prefer `std::string_view` for read-only string parameters
- Use `const` everywhere it applies
- Use `[[nodiscard]]` on functions whose return value must be checked (e.g., `ActionResult`)
- Prefer `std::unordered_map` over `std::map` for string-keyed lookups

### ActionResult Pattern
Every game action returns `ActionResult`. Always check `.ok` before proceeding:

```cpp
auto result = state_.move(side, target_city);
if (!result.ok) {
  send_error(player_id, result.error);
  return;
}
if (result.game_over) {
  broadcast_game_over(result.winner, result.game_over_reason);
}
```

### Thread Safety
- All `Match` state access must hold `mutex_`
- All `MatchManager` access must hold `matches_mutex_`
- WebSocket writes must use the strand/write queue pattern (never call `ws_.write()` concurrently)
- `GameState` is not thread-safe — accessed only through `Match` while holding the match mutex

### JSON Serialization
- Use `nlohmann::json` with `nlohmann::json j; j["key"] = value;` pattern
- Centralize all serialization in `backend/src/protocol/Messages.cpp`
- Never construct JSON strings manually (no `std::string` concatenation for JSON)
- All message types are defined as string constants in `Messages.hpp`

---

## Shared / Protocol Conventions

### Message Type Alignment
Frontend `ClientMessageType` / `ServerMessageType` enum values **must match** the string constants in `backend/include/protocol/Messages.hpp`. If they diverge, the server will drop messages silently.

Canonical source: `stitch-frontend/src/types/Messages.ts`
Backend mirror: `backend/include/protocol/Messages.hpp`

### Adding New State Fields
When adding a field to `MatchState`:
1. Add to `PlayerData` (C++) or `GameState` (C++) as appropriate
2. Add serialization in `serialize_match_state()` in `Messages.cpp`
3. Add the field to `PlayerState` or `MatchState` in `Messages.ts`
4. Update `protocol/schemas/state/board-state.schema.json`

Never add a field to the TypeScript interface without adding it to the backend serializer, and vice versa.

### Fog of War — What to Filter
The server filters state in `serialize_match_state(state, for_player)`. When adding new state:
- Ask: "Should the opponent see this?" If no, filter it.
- Player's own location: always visible
- Opponent's location: only if `known_opponent_city` is set
- Abilities: only own abilities
- Intel count: only own Intel
- Global events (disappear cities, controlled cities): visible to both

---

## Security Rules

These rules are non-negotiable. The server must enforce all of them.

| Rule | Implementation location |
|---|---|
| Validate it's the player's turn | `GameState::move()` etc. — checks `current_turn_` |
| Validate `actionsRemaining > 0` | `GameState` — checks before any action |
| Validate adjacency for MOVE | `CityGraph::are_adjacent()` |
| Validate Intel balance before ability | `GameState::use_ability()` checks cost |
| Validate player owns the session | `Match::handle_action()` checks `player_id` |
| Reject malformed JSON | `Messages.cpp` parse layer — returns error, does not throw |
| Reject unknown message types | `Session.cpp` dispatch — sends `ERROR`, drops message |
| Limit message size | `Session.cpp` — enforce max frame size |
| Prevent double-spending Intel | Server deducts before confirming; no optimistic client deductions |

---

## Documentation Update Rules

When making significant changes, update the relevant docs:

| Change type | Update these files |
|---|---|
| Game rules / mechanics | `docs/game_design/game_design_doc.md` + `.github/GAME_MECHANICS.md` |
| Message protocol | `protocol/schemas/` + `.github/PROTOCOL.md` + `Messages.ts` + `Messages.hpp` |
| Architecture | `docs/architecture.md` + `.github/ARCHITECTURE.md` |
| New type/interface | `.github/DATA_MODELS.md` |
| Build/deploy change | `README.md` + `.github/DEVELOPMENT.md` |
| UI change | `docs/user_journey.md` |
| Agent instructions | `AGENTS.md` |

---

## What NOT to Do

- Do NOT add game logic inside `Session.cpp` or `WebSocketServer.cpp`
- Do NOT add networking calls inside `GameState.cpp`
- Do NOT compute game outcomes in the frontend — always wait for a `MATCH_STATE` from the server
- Do NOT hardcode city data inside `GameState` — city data belongs in `DefaultMap.hpp`
- Do NOT use `any` in TypeScript
- Do NOT commit compiled artifacts (`dist/`, `build/`, `*.o`, `*.a`)
- Do NOT add abilities without updating `AbilityCosts.hpp`
- Do NOT add new state fields on only one side (must update both TypeScript and C++ together)
- Do NOT skip updating `protocol/schemas/` when message formats change

---

## Adding New Abilities

Checklist when implementing a new ability:

1. Add `AbilityId` value to `enum class AbilityId` in `backend/include/game/Player.hpp`
2. Add the matching string in `AbilityId` enum in `stitch-frontend/src/types/Messages.ts`
3. Set the Intel cost in `backend/include/config/AbilityCosts.hpp`
4. Implement the ability logic in `GameState::use_ability()` in `GameState.cpp`
5. Add per-turn flag (if needed) to `PlayerData` in `Player.hpp` and `PlayerState` in `Messages.ts`
6. Add serialization of the new flag in `serialize_match_state()` in `Messages.cpp`
7. Add UI button in `PhaserGame.tsx` action bar with cost display
8. Update `docs/game_design/game_design_doc.md` and `.github/GAME_MECHANICS.md`

---

## Adding New Cities / Changing the Map

1. Update `backend/include/config/DefaultMap.hpp` (add city + edges)
2. The map is sent to clients via `MATCH_START.map` automatically — no frontend code change needed
3. Verify normalized coordinates (0.0–1.0) align with `public/assets/plain-map.png`
4. Update `.github/GAME_MECHANICS.md` city table
5. Update any unit tests that rely on specific adjacency (check `backend/tests/test_map.hpp`)
