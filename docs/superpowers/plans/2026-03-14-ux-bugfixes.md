# UX Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 12 UX/bug issues discovered during playtesting: wrong turn banner text/color, missing Play Again button, timer drift in background tabs, absent intel/cover feedback, city ID in defeat reason, and more.

**Architecture:** Most fixes are confined to `frontend/src/game/scenes/GameScene.ts`. Two cross-cutting concerns touch `App.tsx` (Play Again reset) and `backend/src/game/GameState.cpp` (city display name). No new files needed.

**Tech Stack:** Phaser 3, TypeScript, React, C++17

---

## Chunk 1: Backend — city display name in GAME_OVER reason

### Task 1: Use city display name in defeat reason

**Files:**
- Modify: `backend/src/game/GameState.cpp:162`

- [ ] In `GameState.cpp` line 162, replace raw `target_city` ID with the city's display name by looking it up from the graph:

```cpp
// Before:
game_over_reason_ = std::string(to_string(side)) + " struck " + target_city + " — HIT!";

// After:
const auto* city_def = graph_.get_city(target_city);
const std::string city_display = city_def ? city_def->name : target_city;
game_over_reason_ = std::string(to_string(side)) + " struck " + city_display + " — HIT!";
```

- [ ] Rebuild backend:
```bash
cd backend/build && cmake --build . --target two_spies_server 2>&1 | tail -3
```

- [ ] Kill and restart server:
```bash
kill $(pgrep -f two_spies_server); sleep 0.5 && ./two_spies_server 8080 4 &
```

- [ ] Also revert turn duration back to 15s in `backend/include/game/Match.hpp` and `backend/src/protocol/Messages.cpp`:
  - `Match.hpp`: `static constexpr long long TURN_DURATION_MS = 15000;`
  - `Messages.cpp`: `result["turnDuration"] = 15000;  // 15 seconds in ms`
  - Rebuild + restart again.

---

## Chunk 2: GameScene — Turn banner text and colors

### Task 2: Fix banner copy and colors

**Files:**
- Modify: `frontend/src/game/scenes/GameScene.ts` — `showTurnBanner()` method (~line 638)

The banner currently says "Target's Turn" and uses red for "Your Turn!" (bad UX: red = stop). Fix:
- "Your Turn!" → stays, but use **green** (`C_BANNER_GREEN`)
- "Target's Turn" → `"Opponent's Turn"` with a neutral **dark ink** color

- [ ] In `showTurnBanner()`, change the color and text:

```typescript
// Before:
const bannerColor = isMyTurn ? C_BANNER_RED : C_BANNER_GREEN;
const bannerText  = isMyTurn ? 'Your Turn!' : "Target's Turn";

// After:
const bannerColor = isMyTurn ? C_BANNER_GREEN : 0x5a3a1a;  // green for yours, ink-brown for opponent
const bannerText  = isMyTurn ? 'Your Turn!' : "Opponent's Turn";
```

- [ ] Verify in browser: start a game, check both turn banners look correct.

---

## Chunk 3: GameScene — Timer fixes

### Task 3a: Hide timer on game over

**Files:**
- Modify: `frontend/src/game/scenes/GameScene.ts` — `update()` method (~line 159)

- [ ] In `update()`, add a `gameOver` guard:

```typescript
update(_time: number, _delta: number): void {
  if (this.state && this.timerDisplay) {
    const isMyTurn = this.state.currentTurn === this.state.player.side;
    if (isMyTurn && !this.state.gameOver) {   // <-- add !this.state.gameOver
      // ... existing timer logic
      this.timerDisplay.setVisible(true);
    } else {
      this.timerDisplay.setVisible(false);
    }
  }
}
```

### Task 3b: Fix timer drift when tab is in background

**Files:**
- Modify: `frontend/src/game/scenes/GameScene.ts` — `create()` method

The problem: `lastStateUpdateTime = Date.now()` is set when state arrives, but if the tab is hidden for a long time, `Date.now() - lastStateUpdateTime` accumulates, making the timer show "0 UP!" on switch-back.

Fix: use the Page Visibility API. When the tab becomes visible, reset `lastStateUpdateTime` to `Date.now()` so the local timer resumes from where the server last reported (instead of fast-forwarding).

- [ ] Add at the end of `create()`:

```typescript
// Fix timer drift: when tab comes back into focus, reset local
// timer reference so we don't fast-forward past what the server knows.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    this.lastStateUpdateTime = Date.now();
  }
});
```

### Task 3c: Disable buttons and show message when client timer reaches 0

Currently, when the server expires the turn (15s), the client still shows active buttons. Fix: in `update()`, when it's the player's turn but elapsed >= turnDuration, force-disable buttons and show a message.

- [ ] In `update()`, after computing `elapsed`:

```typescript
if (isMyTurn && !this.state.gameOver) {
  const timeSinceUpdate = Date.now() - this.lastStateUpdateTime;
  const elapsed = this.lastServerElapsedMs + timeSinceUpdate;
  this.timerDisplay.update(elapsed, this.state.turnDuration || 15000);
  this.timerDisplay.setVisible(true);

  // If local timer expired, show message (server will auto-end soon)
  if (elapsed >= (this.state.turnDuration || 15000)) {
    this.showStatus('Turn time expired — waiting for server...', '#c0392b');
  }
} else {
  this.timerDisplay.setVisible(false);
}
```

---

## Chunk 4: GameScene — Gameplay feedback

### Task 4a: Cover change feedback

**Files:**
- Modify: `frontend/src/game/scenes/GameScene.ts` — `onStateUpdate()` method

Track previous cover state and show a status message when it changes.

- [ ] Add a class field:
```typescript
private lastHasCover: boolean | null = null;
```

- [ ] In `onStateUpdate()`, after updating `coverText`, add:
```typescript
const p = this.state.player;
if (this.lastHasCover !== null && this.lastHasCover !== p.hasCover) {
  if (p.hasCover) {
    this.showStatus('Cover active — your position is hidden', '#3a9a3a');
  } else {
    this.showStatus('Cover lost — you are visible', '#c0392b');
  }
}
this.lastHasCover = p.hasCover;
```

### Task 4b: Intel gain feedback

**Files:**
- Modify: `frontend/src/game/scenes/GameScene.ts` — `onStateUpdate()` method

Track previous intel and show "+N intel" when it increases.

- [ ] Add a class field:
```typescript
private lastIntel: number = -1;
```

- [ ] In `onStateUpdate()`, after updating `intelTileValue`, add:
```typescript
if (this.lastIntel >= 0 && p.intel > this.lastIntel) {
  const gain = p.intel - this.lastIntel;
  this.showStatus(`+${gain} intel`, '#5a8a3a');
}
this.lastIntel = p.intel;
```

Note: `showStatus` overwrites any previous status. The cover message should take priority over the intel message. Ensure cover is checked after intel, so it overwrites if both change on the same update.

### Task 4c: Non-adjacent city click feedback

**Files:**
- Modify: `frontend/src/game/scenes/GameScene.ts` — `input.on('pointerdown', ...)` handler (~line 141)

Currently, clicking a non-adjacent city in MOVE mode silently does nothing. Show a message.

- [ ] In the pointerdown handler, after `if (!cityId) return;`, check adjacency via the server state map:

```typescript
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  if (!this.board || !this.state || !this.actionMode) return;
  const cityId = this.board.getCityAtPointer(pointer);
  if (!cityId) return;

  if (this.actionMode === 'MOVE') {
    const currentCity = this.state.player.currentCity;
    const isAdjacent = this.state.map.edges.some(
      e => (e.from === currentCity && e.to === cityId) ||
           (e.to === currentCity && e.from === cityId)
    );
    if (!isAdjacent) {
      this.showStatus('Not adjacent — choose a connected city', '#c0392b');
      return;
    }
    this.net.send(ClientMessageType.PLAYER_ACTION, {
      action: ActionKind.MOVE,
      targetCity: cityId,
    });
    this.actionMode = null;
    this.updateActionButtons();
  }
});
```

### Task 4d: Auto-END_TURN visual warning

**Files:**
- Modify: `frontend/src/game/scenes/GameScene.ts` — `onStateUpdate()` auto-end section (~line 608)

Replace silent 800ms delay with a brief visible countdown message.

- [ ] Change the auto-end-turn block:

```typescript
// Before:
if (isMyTurn && p.actionsRemaining === 0) {
  this.actionMode = null;
  this.showStatus('No actions remaining — ending turn', INK_MID_STR);
  this.time.delayedCall(800, () => {
    this.net.send(ClientMessageType.END_TURN, {});
  });
}

// After:
if (isMyTurn && p.actionsRemaining === 0) {
  this.actionMode = null;
  this.showStatus('No actions remaining — ending turn…', INK_MID_STR);
  this.time.delayedCall(400, () => this.showStatus('Ending turn…', INK_MID_STR));
  this.time.delayedCall(800, () => {
    this.net.send(ClientMessageType.END_TURN, {});
  });
}
```

---

## Chunk 5: Play Again — game over modal + App.tsx reset

### Task 5: Add "Play Again" button and wiring

**Files:**
- Modify: `frontend/src/game/scenes/GameScene.ts` — `showGameOverModal()` (~line 680)
- Modify: `frontend/src/App.tsx` — add listener for game event

The game-over modal currently has no interactive element. Add a "Return to Lobby" button that emits a Phaser game event; App.tsx listens and resets to the lobby phase with a fresh WebSocket.

- [ ] In `showGameOverModal()`, add a button below "Next game in...":

```typescript
// Replace the "Next game in..." text with a button
const btnY = h / 2 + 120;
const btnBg = this.add.rectangle(w / 2, btnY, 200, 40, C_BUTTON_ACTIVE, 1)
  .setDepth(1002)
  .setStrokeStyle(1, C_INK_DARK)
  .setInteractive({ useHandCursor: true });

const btnLabel = this.add.text(w / 2, btnY, 'PLAY AGAIN', {
  fontFamily: FONT_SERIF,
  fontSize: '14px',
  color: WHITE_STR,
  fontStyle: 'bold',
}).setOrigin(0.5).setDepth(1003);

btnBg.on('pointerover', () => btnBg.setFillStyle(0x5a3010));
btnBg.on('pointerout',  () => btnBg.setFillStyle(C_BUTTON_ACTIVE));
btnBg.on('pointerdown', () => {
  this.game.events.emit('return-to-lobby');
});
```

- [ ] In `App.tsx`, inside the `initClient` callback after the Phaser game is created, add:

```typescript
game.events.on('return-to-lobby', () => {
  // Disconnect existing network client
  finalClient.off(ServerMessageType.MATCH_CREATED, onMatchCreated);
  finalClient.off(ServerMessageType.MATCH_START, onMatchStart);
  finalClient.off(ServerMessageType.MATCH_STATE, onMatchState);
  finalClient.off(ServerMessageType.ERROR, onError);
  finalClient.disconnect();
  netRef.current = null;

  // Destroy existing Phaser instance
  gameRef.current?.destroy(true);
  gameRef.current = null;

  // Reset phase to entering-name so user can start fresh
  setPhase('entering-name');
  setRoomCode('');
  setJoinCode('');
  setErrorMsg('');

  // Re-init client (useEffect will NOT re-run since deps=[])
  // Instead, manually call initClient again:
  initClient();
});
```

Note: because `initClient` is defined inside the `useEffect`, extract it to a `useCallback` or a ref so it can be called from the event handler. The cleanest approach: move `initClient` to a `useRef<() => void>` that gets populated once.

**Simpler alternative** (no refactor needed): Instead of calling `initClient` again, just reload the page:
```typescript
game.events.on('return-to-lobby', () => {
  window.location.reload();
});
```
This is less elegant but fully safe and has zero state-management risk. Use this if the refactor is too invasive.

---

## Final checklist

- [ ] Revert turn duration to 15000 in `Match.hpp` and `Messages.cpp`, rebuild + restart backend
- [ ] Run frontend dev server, open two tabs, play through a game
- [ ] Verify: VICTORY/DEFEAT shows "Zurich" not "zurich"
- [ ] Verify: banners say "Your Turn!" (green) and "Opponent's Turn" (brown)
- [ ] Verify: timer hidden on game-over screen
- [ ] Verify: switching between active/inactive tabs doesn't show "0 UP!" immediately
- [ ] Verify: clicking non-adjacent city shows "Not adjacent" message
- [ ] Verify: using last action shows "Ending turn…" message
- [ ] Verify: "PLAY AGAIN" button on game-over screen returns to lobby
- [ ] Verify: intel/cover status messages appear at right times
