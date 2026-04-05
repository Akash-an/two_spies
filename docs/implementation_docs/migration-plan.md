# Migration Plan — Codename Authorization Terminal

Date: 2026-04-03

Purpose
-------
Map the state and handlers in `src/App.tsx` (current/old UI logic) to the props required by the new Stitch component at `src/components/v2/CodenameAuthorizationTerminal.tsx` and provide an integration recipe.

Scope & Assumptions
-------------------
- This plan targets the `CodenameAuthorizationTerminal` component in `src/components/v2/`.
- It assumes `App.tsx` will remain the top-level orchestrator (holds `netRef`, `gameRef`, `phase`, and network event listeners).
- Match state shape follows `MatchState` and `PlayerState` defined in `stitch-stitch-frontend/src/types/Messages.ts` (used by the mock client).

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

---

Wiring the Next Three Screens (detailed plans)
---------------------------------------------
This section documents detailed migration plans for the remaining Stitch screens that now live in `src/components/v2/`:

- `MissionDeploymentHub` → `src/components/v2/MissionDeploymentHub.tsx`
- `SecureLinkFrequency` → `src/components/v2/SecureLinkFrequency.tsx`
- `SurveillanceCommandCenterGlobalMap` → `src/components/v2/SurveillanceCommandCenterGlobalMap.tsx`

For each screen below: Purpose, Props mapping, Derived data, Network mapping, Integration recipe, and QA steps are provided.

1) Mission Deployment Hub
-------------------------
Purpose
- UI for selecting deployable units and assigning them to a mission/target city.

Props on component
- `missionName?: string`
- `availableUnits?: {id:string,name:string,type?:string}[]`
- `onDeploy?: (unitId:string)=>void`
- `targetCity?: string`
- `backgroundImageUrl?: string`
- `logs?: string[]`
- `loading?: boolean`

Mapping (App → props)
- `missionName` ← `latestMatchState.sessionId` or human-friendly name derived from match metadata.
- `availableUnits` ← construct from match context (if you model squads/units in state) or derive placeholder units from `latestMatchState.map.cities` for initial rollout.
- `targetCity` ← `latestMatchState.player.currentCity` or `selectedCityForMission` App state.
- `logs` ← `terminalLogs` state.
- `loading` ← `isConnecting || phase !== 'playing'` (or fine-grained loading state when server confirms deploy).

Network mapping (user actions → messages)
- `onDeploy(unitId)` should validate locally then send a standardized Player Action:
  - Option A (recommended initial): send `ClientMessageType.PLAYER_ACTION` with `action: ActionKind.CONTROL` (if deploy maps best to immediate control semantics).
  - Option B (preferred semantic): send `ClientMessageType.PLAYER_ACTION` with `action: ActionKind.ABILITY` and `abilityId: AbilityId.PREP_MISSION` plus a `unitId` and optional `targetCity` in payload.

Integration recipe (App snippets)
```ts
// imports
import MissionDeploymentHub from './components/v2/MissionDeploymentHub';
import { ClientMessageType, ActionKind, AbilityId } from './types/Messages';

// derive values
const missionName = latest?.sessionId ?? 'Local Mission';
const missionAvailableUnits = latest?.map?.cities?.slice(0,4).map(c=>({id:c.id, name:c.name, type:'INF'})) ?? [];
const missionTargetCity = latest?.player?.currentCity;

const handleDeploy = (unitId: string) => {
  pushLog(`Deploy ${unitId} -> ${missionTargetCity ?? 'unknown'}`);
  const net = netRef.current;
  if (!net) return;
  // Option B — semantic mapping
  net.send(ClientMessageType.PLAYER_ACTION, { action: ActionKind.ABILITY, abilityId: AbilityId.PREP_MISSION, unitId, targetCity: missionTargetCity });
};

// Render (visible when user opens deploy UI)
<MissionDeploymentHub
  missionName={missionName}
  availableUnits={missionAvailableUnits}
  onDeploy={handleDeploy}
  targetCity={missionTargetCity}
  logs={terminalLogs}
  loading={isConnecting}
/>
```

Validation & QA
- Clicking a deploy button triggers `handleDeploy`, which sends a `PLAYER_ACTION`; use `MockNetworkClient` logs to verify payload shape.
- Server should validate cost/turn ownership and respond with `MATCH_STATE` to confirm unit state; verify `latestMatchState` updates appear in UI.
- Edge cases: running out of Intel, not your turn, or invalid `targetCity` — ensure UI disables the button and server-side validation enforces rules.

Notes
- If your server implements deploy as a multi-step flow, the component can emit `onDeployRequest` and `onDeployConfirm` to support staged interactions.

2) Secure Link Frequency
------------------------
Purpose
- Small terminal to tune secure frequencies (used for encryption handshake or link establishment). Presents a numeric frequency and a 'Tune' action.

Props on component
- `frequency?: number|string`
- `onTune?: (value:number|string)=>void`
- `autoTune?: boolean`
- `logs?: string[]`
- `loading?: boolean`

Mapping (App → props)
- `frequency` ← `latest?.player?.intel` or persistent user preference if this frequency is player-configured.
- `logs` ← `terminalLogs`
- `loading` ← `isConnecting` or ability-in-progress flag

Network mapping
- `onTune(value)` → send `ClientMessageType.PLAYER_ACTION` with `action: ActionKind.ABILITY` and `abilityId: AbilityId.ENCRYPTION` and include `frequency: value` in the payload. Example payload:
  ```json
  { "action": "ABILITY", "abilityId": "ENCRYPTION", "frequency": "123.4" }
  ```
  Server-side: treat `frequency` as an ability parameter; validate cost and effect.

Integration recipe (App snippets)
```ts
import SecureLinkFrequency from './components/v2/SecureLinkFrequency';
import { AbilityId, ClientMessageType, ActionKind } from './types/Messages';

const secureFrequency = latest?.player?.intel ? `${latest.player.intel}.0` : '000.0';

const handleTune = (value: number|string) => {
  pushLog(`Tuning frequency ${value}`);
  const net = netRef.current;
  if (!net) return;
  net.send(ClientMessageType.PLAYER_ACTION, { action: ActionKind.ABILITY, abilityId: AbilityId.ENCRYPTION, frequency: value });
};

<SecureLinkFrequency frequency={secureFrequency} onTune={handleTune} logs={terminalLogs} loading={isConnecting} />
```

Validation & QA
- Confirm the `PLAYER_ACTION` message includes `frequency` on tune.
- Verify server consumes parameter and returns a `MATCH_STATE` or ability-specific confirmation message.
- Test invalid frequencies (format/limits) and ensure server rejects malformed values.

Notes
- Keep client-side validation strict (numeric range/format) but rely on server for security and cost enforcement.

3) Surveillance Command Center — Global Map
------------------------------------------
Purpose
- Map-based interface to visualize city markers, select cities, and inspect surveillance logs.

Props on component
- `mapImageUrl?: string`
- `cities?: {id:string,name:string,x:number,y:number}[]` (coordinates as percent 0–100)
- `selectedCityId?: string`
- `onSelectCity?: (id:string)=>void`
- `logs?: string[]`

Mapping (App → props)
- `mapImageUrl` ← optional Stitch screenshot or map asset path.
- `cities` ← map over `latestMatchState.map.cities` and convert normalized coords to percentages:
  ```ts
  const cities = latest?.map?.cities?.map(c => ({ id: c.id, name: c.name, x: c.x * 100, y: c.y * 100 })) ?? [];
  ```
- `selectedCityId` ← `appSelectedCity` or `latest?.player?.knownOpponentCity` (if inspecting last known opponent location).
- `logs` ← `terminalLogs`

Network mapping
- `onSelectCity(id)` typically means the player wants to inspect or move to that city.
  - Quick mapping: call `net.send(ClientMessageType.PLAYER_ACTION, { action: ActionKind.MOVE, targetCity: id })` to attempt a move.
  - Alternative: open a detail modal and send a specific action (e.g., ability or strike) from that modal.

Integration recipe (App snippets)
```ts
import SurveillanceCommandCenterGlobalMap from './components/v2/SurveillanceCommandCenterGlobalMap';
import { ClientMessageType, ActionKind } from './types/Messages';

const mapCities = latest?.map?.cities?.map(c => ({ id: c.id, name: c.name, x: c.x * 100, y: c.y * 100 })) ?? [];

const handleSelectCity = (id: string) => {
  pushLog(`Selecting city ${id}`);
  const net = netRef.current;
  if (!net) return;
  net.send(ClientMessageType.PLAYER_ACTION, { action: ActionKind.MOVE, targetCity: id });
};

<SurveillanceCommandCenterGlobalMap mapImageUrl={'/assets/maps/europe.png'} cities={mapCities} onSelectCity={handleSelectCity} logs={terminalLogs} />
```

Validation & QA
- Clicking a marker should trigger `handleSelectCity` and send a `PLAYER_ACTION` of type `MOVE` to the server.
- Confirm resulting `MATCH_STATE` reflects the new `player.currentCity` after the server accepts the move.
- Test selecting when not your turn — UI should block or show an explanatory message and no network message should be sent.

Common Integration Notes
------------------------
- Placement: these screens can be shown as overlays (like the Codename Terminal) or integrated into a HUD/sidebar accessible from the `playing` phase. For now prefer overlays with explicit open/close controls to reduce risk.
- Event integration with Phaser: Game scenes can emit events to React via `game.events.emit('open-deploy', {...})` or read/write via `game.registry`; App remains the single source of truth.
- Logging: reuse `terminalLogs` for component `logs` props so events and server responses are visible in these UIs.
- Permissions: always validate that the player owns the current turn before enabling actions; client checks are UX optimisations only — server must enforce rules.

Acceptance criteria
-------------------
1. Each component receives the mapped props and renders correctly using data derived from `latestMatchState`.
2. User actions produce `ClientMessageType.PLAYER_ACTION` messages with the expected payload shape.
3. Server `MATCH_STATE` responses update the `latestMatchState` in Phaser registry and the UI reflects those updates.
4. UI disables actions when it is not the player's turn or when resources are insufficient.

Next steps
----------
- Implement any additional payload fields the server expects for `Ability` actions (e.g., `unitId`, `frequency`).
- Replace preview toolbar usage with permanent UI triggers (buttons / HUD icons) as part of the planned migration to the new Stitch screens.
- Optionally add unit tests that simulate `MockNetworkClient` messages and verify each component's handler sends the correct outgoing payload.

