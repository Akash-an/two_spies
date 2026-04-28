# Backend ↔ stitch-frontend Interactions

This document maps all protocol interactions between the C++ backend and the React/TypeScript frontend.

---

## 1. Client → Server Messages

| Message | Payload | Backend Handler |
|---|---|---|
| `CREATE_MATCH` | `{}` | `MatchManager::create_match()` |
| `JOIN_MATCH` | `{code}` | `MatchManager::join_match()` |
| `SET_PLAYER_NAME`| `{name}` | `Session::set_player_name()` |
| `PLAYER_ACTION` | `{action, targetCity, abilityId}` | `GameState::use_action()` |
| `END_TURN` | `{}` | `Match::handle_end_turn()` |

### Action Types
- **MOVE**: Move to adjacent city.
- **STRIKE**: Attempt elimination at current location.
- **ABILITY**: Execute `LOCATE` or `DEEP_COVER`.
- **CONTROL**: Claim Intel at current city.
- **WAIT**: Pass an action point.

---

## 2. Server → Client Messages

| Message | Payload | Trigger |
|---|---|---|
| `MATCH_CREATED` | `{code}` | Successful `CREATE_MATCH`. |
| `MATCH_START` | `{player}` | Both players joined. |
| `MATCH_STATE` | `MatchState` | State update or periodic timer. |
| `TURN_CHANGE` | `{turnNumber, currentTurn}` | End of turn or timeout. |
| `GAME_OVER` | `{winner, reason}` | Victory condition met. |
| `ERROR` | `{message}` | Validation failure. |

---

## 3. Game State Structure

### Player State
```typescript
interface PlayerState {
  side: 'RED' | 'BLUE';
  currentCity: string;
  intel: number;
  actionsRemaining: number;
  abilities: string[];
  knownOpponentCity: string | null;
  // Feedback flags
  opponentUsedStrike: boolean;
  opponentUsedLocate: boolean;
  opponentUsedDeepCover: boolean;
  locateBlockedByDeepCover: boolean;
}
```

### Match State
```typescript
interface MatchState {
  turnNumber: number;
  currentTurn: 'RED' | 'BLUE';
  player: PlayerState;
  opponentName: string;
  map: { cities: City[], edges: Edge[] };
  gameOver: boolean;
  winner: string | null;
  scheduledDisappearCity: string | null;
  disappearedCities: string[];
  isPlayerStranded: boolean;
  controlledCities: Record<string, string>;
  intelPopups: { city: string, amount: number }[];
  timeElapsedMs: number;
}
```

---

## 4. Key Logic Notes
- **Authoritative Server**: Backend validates all actions and computes state transitions.
- **Filtered State**: Clients only receive information visible to them (e.g., hidden opponent position).
- **Turn Timer**: Turns last 30 seconds. Timeout results in an automatic `END_TURN`.
- **Deep Cover**: Blocks `LOCATE` attempts and reveals the attacker's position.
