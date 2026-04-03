# Migration Plan — Codename Authorization Terminal

Date: 2026-04-03

Purpose
-------
Map the state and handlers in `src/App.tsx` (current/old UI logic) to the props required by the new Stitch component at `src/components/v2/CodenameAuthorizationTerminal.tsx` and provide an integration recipe.

Scope & Assumptions
-------------------
- This plan targets the `CodenameAuthorizationTerminal` component in `src/components/v2/`.
- It assumes `App.tsx` will remain the top-level orchestrator (holds `netRef`, `gameRef`, `phase`, and network event listeners).
- Match state shape follows `MatchState` and `PlayerState` defined in `frontend/src/types/Messages.ts` (used by the mock client).

High-level mapping
------------------
Below are the recommended one-to-one mappings from `App.tsx` variables/handlers → `CodenameAuthorizationTerminal` props.

- `playerName` (React state in `App`) → `operativeCodename` (prop)
  - Rationale: the component's initial input should reflect the player's persisted name.

- `handleNameSubmit(name)` (existing callback in `App`) → `onEstablish` (prop)
  - Implementation: `onEstablish` should call the same logic as `handleNameSubmit`:
    - `setPlayerName(name)`
    - `gameRef.current?.registry.set('playerName', name)` (so Phaser GameScene sees it)
    - `netRef.current?.send(ClientMessageType.SET_PLAYER_NAME, { name })`
    - advance `phase` as appropriate (e.g. `'lobby'`)

- `setPlayerName` (or a small local draft) → `onInputChange` (prop)
  - Implementation: map user typing to `setPlayerName` so App keeps a single source of truth.

- Network & connection state (new `isConnecting` boolean recommended) → `loading` (prop)
  - Set `loading` to true while establishing the WebSocket or while waiting for match creation/join: e.g. `phase === 'creating' || phase === 'waiting' || isConnecting`.

- `errorMsg` and network event notifications → push entries into a new `terminalLogs: string[]` state and pass it as `terminalLog` (prop)
  - Record key events: connection success, MATCH_CREATED (code), MATCH_START, MATCH_STATE updates, ERROR messages.

- Derived location props (`sector`, `latitude`, `longitude`) → computed from `latestMatchState` stored in Phaser registry (or from the `MATCH_STATE` payload kept in App)
  - Example resolution flow:
    - const latest: MatchState | undefined = gameRef.current?.registry.get('latestMatchState');
    - const cityId = latest?.player.currentCity;
    - const cityDef = latest?.map?.cities?.find(c => c.id === cityId);
    - `sector` = `cityDef?.name ?? '—'`
    - `latitude`/`longitude` = format `cityDef?.y` / `cityDef?.x` (choose the desired display format — raw normalized (0-1) or percent/deg).

- `threatLevel` → derived from `MatchState` flags
  - Suggested logic (tweak to fit UX):
    - if `latest?.isPlayerStranded` ⇒ `STRANDED`
    - else if `latest?.player.opponentUsedStrike` ⇒ `HIGH`
    - else if `latest?.player.hasCover` ⇒ `LOW`
    - otherwise ⇒ `NORMAL`

- `backgroundImageUrl` → optional asset or Stitch screenshot path
  - If you generated Stitch screenshots earlier, pass their public path (or `/stitch-assets/<name>.png`) to preserve visual fidelity.

Integration recipe (code snippets)
---------------------------------
1) Add imports at top of `src/App.tsx`:

```ts
import CodenameAuthorizationTerminal from './components/v2/CodenameAuthorizationTerminal';
import { ClientMessageType } from './types/Messages';
```

2) Add new App-level state (near other useState calls):

```ts
const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
const [isConnecting, setIsConnecting] = useState(false);

const pushLog = (msg: string) => setTerminalLogs((s) => [...s, `${new Date().toLocaleTimeString()}: ${msg}`]);
```

3) Push relevant events into `terminalLogs` in your existing `useEffect` network init and handlers:

```ts
// when connection starts
setIsConnecting(true);
// on successful connect
setIsConnecting(false); pushLog('Network connected');
// onMatchCreated
pushLog(`Match created: ${code}`);
// onMatchStart
pushLog('Match started');
// onMatchState
pushLog('MATCH_STATE received');
// onError
pushLog(`ERROR: ${msg}`);
```

4) Compute derived props before rendering the component:

```ts
const latest = gameRef.current?.registry.get('latestMatchState') as MatchState | undefined;
const cityDef = latest?.map?.cities?.find(c => c.id === latest?.player?.currentCity);
const sector = cityDef?.name ?? '—';
const latitude = cityDef ? (cityDef.y * 100).toFixed(1) : '—';
const longitude = cityDef ? (cityDef.x * 100).toFixed(1) : '—';
const threatLevel = latest
  ? latest.isPlayerStranded ? 'STRANDED'
  : latest.player.opponentUsedStrike ? 'HIGH'
  : latest.player.hasCover ? 'LOW'
  : 'NORMAL'
  : 'UNKNOWN';
```

5) Implement `onEstablish` wrapper (use the same semantics as `handleNameSubmit`):

```ts
const onTerminalEstablish = (codename: string) => {
  setPlayerName(codename);
  if (gameRef.current) gameRef.current.registry.set('playerName', codename);
  const net = netRef.current;
  if (net) net.send(ClientMessageType.SET_PLAYER_NAME, { name: codename });
  setPhase('lobby'); // keep existing flow
  pushLog(`Player name set: ${codename}`);
};
```

6) Render the Stitch component in place of the old name modal (example):

```tsx
{phase === 'entering-name' && (
  <CodenameAuthorizationTerminal
    operativeCodename={playerName}
    onEstablish={onTerminalEstablish}
    onInputChange={(v) => setPlayerName(v)}
    loading={isConnecting || phase === 'creating' || phase === 'waiting'}
    initializingText={isConnecting ? 'Connecting to server…' : 'INITIALIZING LINK...'}
    terminalLog={terminalLogs}
    sector={sector}
    latitude={latitude}
    longitude={longitude}
    threatLevel={threatLevel}
    backgroundImageUrl={/* optional: '/stitch-assets/codename-authorization-terminal.png' */}
  />
)}
```

Validation & QA steps
---------------------
1. Start the app and verify the terminal shows the current `playerName` and accepts edits.
2. Click `ESTABLISH CONNECTION` and verify `ClientMessageType.SET_PLAYER_NAME` is sent (monitor MockNetworkClient logs) and `playerName` is updated in Phaser registry.
3. Trigger `CREATE_MATCH` from the lobby and confirm terminal logs show `Match created` and `MATCH_STATE` events.
4. Verify `sector`, `latitude`, and `longitude` update after the first `MATCH_STATE` is received.
5. Test error handling: force an error and confirm an entry appears in `terminalLog` and `errorMsg` still shows where appropriate.

Notes & recommendations
-----------------------
- Keep `PlayerNameModal` around as a fallback while migrating; replace it only when the Terminal is fully verified.
- `CodenameAuthorizationTerminal` is intentionally presentation-only: all game/network logic should remain inside `App.tsx` (or inside an adapter passed as props) to preserve separation of concerns.
- If you prefer, pass a small `network` adapter prop instead of raw `onEstablish` so Stitch components can remain purely UI (e.g., `networkAdapter={ { send: (t,p)=>netRef.current?.send(t,p) } }`).

Summary
-------
This migration keeps `App.tsx` as the single source of truth for network and match lifecycle while delegating UX to the Stitch component. The key changes are creating `terminalLogs` and `isConnecting` states, wiring `onEstablish` to `handleNameSubmit` logic, and deriving `sector/coords/threat` from `latestMatchState` stored in the Phaser registry.
