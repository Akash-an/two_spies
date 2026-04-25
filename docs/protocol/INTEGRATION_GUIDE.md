# Backend ↔ stitch-frontend Integration Guide

> **⚠️ TERMINOLOGY (Critical): "frontend" now ALWAYS refers to `stitch-frontend/` — the canonical client. The older `frontend/` directory is **DEPRECATED** and must NOT be used.**

**Detailed flow examples and integration patterns for stitch-frontend developers.**

---

## Table of Contents

1. [Complete Game Session Flow](#complete-game-session-flow)
2. [Complex Ability Interactions](#complex-ability-interactions)
3. [Notification Patterns](#notification-patterns)
4. [UI State Management](#ui-state-management)
5. [Error Recovery](#error-recovery)

---

## Complete Game Session Flow

### Step 1: Player Creates Match

**stitch-frontend:**
```typescript
// LobbyScene
const createMatch = () => {
  network.send('CREATE_MATCH', {});
};

network.on('MATCH_CREATED', (msg) => {
  const code = msg.payload.code;
  displayRoomCode(code);  // "Share code: ABC123"
  this.sessionId = msg.sessionId;
  setPlayerName();  // Prompt for name
});
```

**Backend:**
```cpp
// WebSocketServer receives message
MatchManager::create_match()
  → Creates Match instance
  → Generates random code "ABC123"
  → Returns MATCH_CREATED with code + sessionId
```

**Network Exchange:**
```json
// Client → Server
{
  "type": "CREATE_MATCH",
  "payload": {}
}

// Server → Client
{
  "type": "MATCH_CREATED",
  "sessionId": "abc123xyz789",
  "payload": {
    "code": "ABC123",
    "sessionId": "abc123xyz789"
  }
}
```

---

### Step 2: Player Sets Name

**stitch-frontend:**
```typescript
// Called after MATCH_CREATED
const setPlayerName = () => {
  const name = prompt("Enter your agent name:");
  if (name) {
    network.send('SET_PLAYER_NAME', { name });
  }
};
```

**Backend:**
```cpp
// Session stores name for later use
Session::set_player_name("Agent Shadow")
  → player_name_ = "Agent Shadow"
  // Name will be included in next MATCH_STATE
```

**Network Exchange:**
```json
// Client → Server
{
  "type": "SET_PLAYER_NAME",
  "payload": { "name": "Agent Shadow" }
}

// No immediate response — name appears in next MATCH_STATE
```

---

### Step 3: Opponent Joins Match

**Opponent's stitch-frontend:**
```typescript
// LobbyScene - Join screen
const joinMatch = (code) => {
  network.send('JOIN_MATCH', { code });
};

network.on('WAITING_FOR_OPPONENT', (msg) => {
  showWaitingScreen();
  setPlayerName();  // Also set opponent's name
});

network.on('MATCH_START', (msg) => {
  const { side, startingCity, opponentStartingCity } = msg.payload.player;
  
  this.playerSide = side;  // 'RED' or 'BLUE'
  this.startingCity = startingCity;
  this.opponentStartingCity = opponentStartingCity;
  
  // Transition to board
  this.scene.start('GameScene');
});
```

**Creator's stitch-frontend (simultaneously):**
```typescript
network.on('MATCH_START', (msg) => {
  // Both players receive MATCH_START at same time
  // Transition to board
  this.scene.start('GameScene');
});
```

**Backend:**
```cpp
// MatchManager receives JOIN_MATCH
1. Get match from code "ABC123"
2. Call match.add_player(opponent_player_id)
   → Assigns side BLUE (RED already added)
3. Check match.is_full()
   → True! Both players present
4. Call match.start(random_seed)
   → Assigns starting cities (e.g., RED→Prague, BLUE→Moscow)
   → Calls GameState::initialize()
   → Broadcasts MATCH_START to both players
   → Broadcasts initial MATCH_STATE to both players
```

**Network Exchange:**
```json
// Opponent Client → Server
{
  "type": "JOIN_MATCH",
  "payload": { "code": "ABC123" }
}

// Server → Opponent Client (immediately)
{
  "type": "WAITING_FOR_OPPONENT",
  "sessionId": "...",
  "payload": {}
}

// Server → Both Clients (when both joined)
{
  "type": "MATCH_START",
  "sessionId": "...",
  "payload": {
    "sessionId": "...",
    "player": {
      "side": "RED",          // RED player gets this
      "startingCity": "prague",
      "opponentStartingCity": "moscow"
    }
  }
}

// Server → Both Clients (immediately after MATCH_START)
{
  "type": "MATCH_STATE",
  "sessionId": "...",
  "payload": { ... }  // See GameState structure
}
```

---

### Step 4: RED Player's Turn 1

**stitch-frontend (GameScene):**
```typescript
create() {
  // Initialize board from MATCH_STATE
  this.board = new BoardRenderer(state.map);
  this.board.setPlayerPosition(state.player.currentCity);
  
  // Display HUD
  this.drawHUD();
  
  // Enable action buttons (it's RED's turn, RED is this player)
  this.enableActionButtons();
}

update() {
  // Listen for actions
  this.inputManager.on('cityClicked', (cityId) => {
    if (this.movementMode) {
      this.requestMove(cityId);
    }
  });
  
  this.inputManager.on('actionButtonClicked', (action) => {
    this.handleActionButton(action);
  });
}

private requestMove(targetCity: string) {
  // stitch-frontend already validated: adjacent cities, etc.
  network.send('PLAYER_ACTION', {
    action: 'MOVE',
    targetCity: targetCity
  });
}
```

**Backend:**
```cpp
// Session receives PLAYER_ACTION
Session::on_message(json msg)
  → parse_client_message(msg)
  → route to Match::handle_action()

Match::handle_action(player_id, action, targetCity, abilityId)
  1. Validate it's player's turn
  2. Call GameState::use_action(action, targetCity)
  3. Update game state
  4. Call broadcast_state()

GameState::use_action(MOVE, "berlin")
  1. Validate berlin is adjacent to current_city
  2. Set player.current_city = "berlin"
  3. Decrement player.actions_remaining
  4. Return success
```

**Network Exchange:**
```json
// RED Client → Server
{
  "type": "PLAYER_ACTION",
  "sessionId": "...",
  "payload": {
    "action": "MOVE",
    "targetCity": "berlin"
  }
}

// Server → Both Clients (updated state)
{
  "type": "MATCH_STATE",
  "sessionId": "...",
  "payload": {
    "turnNumber": 1,
    "currentTurn": "RED",
    "player": {
      "currentCity": "berlin",  // RED now in berlin
      "actionsRemaining": 1,    // 2 - 1 = 1
      ...
    },
    ...
  }
}
```

---

### Step 5: RED Ends Turn

**stitch-frontend:**
```typescript
const handleEndTurnButton = () => {
  network.send('END_TURN', {});
};

network.on('TURN_CHANGE', (msg) => {
  // Turn passed to BLUE
  this.currentTurn = msg.payload.currentTurn;  // 'BLUE'
  
  // Disable action buttons (not RED's turn)
  this.disableActionButtons();
  
  // Show whose turn it is
  this.updateTurnIndicator(`${msg.payload.currentTurn}'s Turn`);
});
```

**Backend:**
```cpp
// Session receives END_TURN
Match::handle_end_turn(player_id)
  1. Validate it's player's turn
  2. Call GameState::end_turn()
     → Clear opponent_used_strike, opponent_used_locate flags
     → Check Deep Cover expiry
     → Clear expired Deep Cover
  3. Switch current_turn to opposite player
  4. Reset actions_remaining = 2
  5. Broadcast TURN_CHANGE
  6. Broadcast new MATCH_STATE
```

**Network Exchange:**
```json
// RED Client → Server
{
  "type": "END_TURN",
  "sessionId": "...",
  "payload": {}
}

// Server → Both Clients
{
  "type": "TURN_CHANGE",
  "sessionId": "...",
  "payload": {
    "turnNumber": 2,
    "currentTurn": "BLUE"
  }
}

// Server → Both Clients (immediately)
{
  "type": "MATCH_STATE",
  "sessionId": "...",
  "payload": {
    "turnNumber": 2,
    "currentTurn": "BLUE",
    "player": {
      // For RED player (receiving):
      "actionsRemaining": 2,  // Reset
      "opponentUsedStrike": false,  // Cleared
      "opponentUsedLocate": false,  // Cleared
      ...
    },
    ...
  }
}
```

---

## Complex Ability Interactions

### Scenario: DEEP_COVER Blocks LOCATE

**Turn Sequence:**

```
Turn 1: RED at Prague, BLUE at Moscow
Turn 2: BLUE uses DEEP_COVER
  → backend sets: opponent_deep_cover_active = true, opponent_deep_cover_used_on_turn = 2

Turn 3: RED uses LOCATE
  → backend checks: opponent_deep_cover_active?
    YES → locate blocked!
    → Sets: player.known_opponent_city = "prague" (RED's position revealed!)
    → Sets: opp.known_opponent_city = "prague" (BLUE learns RED is in Prague)
    → Sets: player.locate_blocked_by_deep_cover = true

Turn 4: End of turn 2+2=4 turns since Deep Cover used on turn 2
  → Deep Cover expires automatically in end_turn()
```

**stitch-frontend Implementation (RED player, Turn 3):**

```typescript
// RED wants to use Locate
network.send('PLAYER_ACTION', {
  action: 'ABILITY',
  abilityId: 'LOCATE'
});

// Wait for MATCH_STATE
network.on('MATCH_STATE', (msg) => {
  const state = msg.payload;
  
  if (state.player.locateBlockedByDeepCover) {
    // Locate was blocked
    showBanner("Locate blocked by Deep Cover! Your position revealed!");
    showNotification("Opponent knows you're in " + state.player.currentCity);
  } else if (state.player.knownOpponentCity) {
    // Locate succeeded
    showBanner("Opponent located at " + state.player.knownOpponentCity);
    updateOpponentMarker(state.player.knownOpponentCity);
  }
});
```

**stitch-frontend Implementation (BLUE player, Turn 3):**

```typescript
network.on('MATCH_STATE', (msg) => {
  const state = msg.payload;
  
  if (state.player.opponentUsedLocate) {
    // Opponent used Locate
    if (state.player.opponentUsedDeepCover_was_active) {
      // This is handled implicitly — BLUE's Deep Cover blocked it
      // BLUE sees opponent tried but was blocked
    }
  }
});
```

**Backend (GameState.cpp, line 263):**

```cpp
case ActionKind::LOCATE: {
  const auto& opp = player(opposite(for_player));
  
  // Check if opponent is in Deep Cover
  if (opp.deep_cover_active) {
    // Locate is blocked! Reveal striker position instead
    auto& opp_mut = player_mut(opposite(for_player));
    opp_mut.known_opponent_city = p.current_city;  // Reveal striker
    
    // Flag it for the locating player
    auto& p_mut = player_mut(for_player);
    p_mut.locate_blocked_by_deep_cover = true;
  } else {
    // Locate succeeds — reveal opponent's position
    auto& p_mut = player_mut(for_player);
    p_mut.known_opponent_city = opp.current_city;
  }
  
  actions_remaining_of(for_player)--;
  break;
}
```

---

### Scenario: Intel Control & City Claiming

**stitch-frontend (showing Intel pickup):**

```typescript
// Player arrives at Prague where Intel is available
// Board shows "Intel here" indicator

const claimIntel = () => {
  network.send('PLAYER_ACTION', {
    action: 'CONTROL'
  });
};

network.on('MATCH_STATE', (msg) => {
  const state = msg.payload;
  
  if (state.player.claimedIntel) {
    // Show celebration
    showBanner("Intel claimed! +10 (total: " + state.player.intel + ")");
    
    // Update controlled cities display
    updateControlledCities(state.controlledCities);
  }
});
```

**Backend (GameState.cpp):**

```cpp
case ActionKind::CONTROL: {
  auto& p_mut = player_mut(for_player);
  
  // Claim Intel at current city
  p_mut.intel += 10;
  p_mut.claimed_intel_this_turn = true;
  
  // Mark city as controlled by this player
  city_controllers_[p_mut.current_city] = for_player;
  
  actions_remaining_of(for_player)--;
  break;
}
```

**Serialization (Messages.cpp, line 145):**

```json
{
  "turnNumber": 1,
  "player": {
    "intel": 10,
    "claimedIntel": true,
    ...
  },
  "controlledCities": {
    "prague": "RED",
    "moscow": "BLUE"
  },
  "intelPopups": []  // Intel removed from this city
}
```

---

### Scenario: STRIKE Succeeds → Game Ends

**stitch-frontend (RED player attempting strike on Moscow):**

```typescript
// RED is in Berlin (adjacent to Moscow)
network.send('PLAYER_ACTION', {
  action: 'STRIKE',
  targetCity: 'moscow'
});

// Wait for response...
network.on('MATCH_STATE', (msg) => {
  const state = msg.payload;
  
  if (state.gameOver && state.winner === 'RED') {
    showBanner("SUCCESS! Opponent eliminated!");
    showWinnerModal("You win! Opponent was at " + state.player.knownOpponentCity);
  }
});

// Or if it fails:
network.on('MATCH_STATE', (msg) => {
  const state = msg.payload;
  
  if (state.player.opponentUsedStrike) {
    showBanner("Strike missed! Your position is revealed!");
    updateOpponentMarker(state.player.currentCity);
  }
});
```

**Backend (GameState.cpp, line 227):**

```cpp
case ActionKind::STRIKE: {
  const auto& opp = player(opposite(for_player));
  
  // Check if opponent is in target city
  if (opp.current_city == target_city) {
    // HIT! Game over
    set_game_over(for_player);  // This player wins
    return;  // State now shows gameOver=true, winner=RED
  } else {
    // MISS! Reveal attacker position
    auto& opp_mut = player_mut(opposite(for_player));
    opp_mut.known_opponent_city = p.current_city;
  }
  
  actions_remaining_of(for_player)--;
  break;
}
```

**Network Exchange (Success):**

```json
// RED Client → Server
{
  "type": "PLAYER_ACTION",
  "payload": { "action": "STRIKE", "targetCity": "moscow" }
}

// Server → Both Clients
{
  "type": "MATCH_STATE",
  "payload": {
    "gameOver": true,
    "winner": "RED",
    "player": {
      "side": "RED",
      "knownOpponentCity": "moscow"
      // ... RED sees opponent was in Moscow
    }
  }
}

// Alternative: Server → Both Clients (via another message?)
{
  "type": "GAME_OVER",
  "payload": {
    "winner": "RED",
    "reason": "STRIKE_SUCCESS"
  }
}
```

---

## Notification Patterns

### BannerDedup Strategy

**Problem:** After `PLAYER_ACTION`, server broadcasts `MATCH_STATE`. stitch-frontend should show banner, but only once per turn change, not repeatedly.

**Solution:** Track `lastNotificationTurn` for each notification type.

```typescript
// GameScene.ts
private lastStrikeBannerTurn = -1;
private lastLocateBannerTurn = -1;
private lastDeepCoverBannerTurn = -1;
private lastLocateBlockedBannerTurn = -1;

network.on('MATCH_STATE', (msg) => {
  const state = msg.payload;
  const currentTurn = state.turnNumber;
  
  // Strike notification
  if (state.player.opponentUsedStrike && this.lastStrikeBannerTurn !== currentTurn) {
    showBanner("Opponent attempted strike!");
    this.lastStrikeBannerTurn = currentTurn;
  }
  
  // Locate blocked notification
  if (state.player.locateBlockedByDeepCover && this.lastLocateBlockedBannerTurn !== currentTurn) {
    showBanner("Locate blocked! Your position revealed!");
    this.lastLocateBlockedBannerTurn = currentTurn;
  }
  
  // Deep Cover notification
  if (state.player.opponentUsedDeepCover && this.lastDeepCoverBannerTurn !== currentTurn) {
    showBanner("Opponent activated Deep Cover!");
    this.lastDeepCoverBannerTurn = currentTurn;
  }
});
```

---

### Toast/Banner Display

**stitch-frontend Pattern:**

```typescript
private showBanner(text: string, duration: number = 2000) {
  const banner = this.add.text(
    this.game.scale.width / 2,
    50,
    text,
    {
      font: "'Georgia', serif",
      fontSize: 24,
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 2,
    }
  );
  
  banner.setOrigin(0.5, 0).setDepth(1000);
  
  // Fade out after duration
  this.tweens.add({
    targets: banner,
    alpha: { from: 1, to: 0 },
    duration: duration,
    onComplete: () => banner.destroy(),
  });
}
```

---

## UI State Management

### Action Button State Machine

```typescript
// GameScene.ts
class GameScene extends Phaser.Scene {
  private actionMode: 'MOVE' | 'STRIKE' | 'LOCATE' | null = null;
  
  private onActionButtonClick(actionType: string) {
    if (this.state.currentTurn !== this.playerSide) {
      // Not this player's turn
      return;
    }
    
    if (this.state.player.actionsRemaining === 0) {
      // Out of actions
      return;
    }
    
    switch (actionType) {
      case 'MOVE':
        this.actionMode = 'MOVE';
        this.board.highlightAdjacent(this.state.player.currentCity);
        break;
      
      case 'STRIKE':
        this.actionMode = 'STRIKE';
        this.board.highlightVisible();
        break;
      
      case 'LOCATE':
        // Send immediately (no targeting)
        this.sendAbility('LOCATE');
        break;
      
      case 'DEEP_COVER':
        this.sendAbility('DEEP_COVER');
        break;
      
      case 'WAIT':
        this.sendAction('WAIT');
        break;
      
      case 'END_TURN':
        network.send('END_TURN', {});
        break;
    }
  }
  
  private onBoardCityClick(cityId: string) {
    if (this.actionMode === 'MOVE') {
      this.sendAction('MOVE', cityId);
      this.actionMode = null;
    } else if (this.actionMode === 'STRIKE') {
      this.sendAction('STRIKE', cityId);
      this.actionMode = null;
    }
  }
  
  private sendAction(action: string, targetCity?: string) {
    const payload: any = { action };
    if (targetCity) payload.targetCity = targetCity;
    
    network.send('PLAYER_ACTION', payload);
  }
  
  private sendAbility(abilityId: string, targetCity?: string) {
    const payload: any = { action: 'ABILITY', abilityId };
    if (targetCity) payload.targetCity = targetCity;
    
    network.send('PLAYER_ACTION', payload);
  }
}
```

---

### HUD Update Pattern

```typescript
private updateHUD(state: MatchState) {
  // Turn indicator
  this.turnText.setText(`Turn ${state.turnNumber}`);
  this.turnOwnerText.setText(
    state.currentTurn === this.playerSide ? "Your Turn" : `${state.currentTurn}'s Turn`
  );
  
  // Actions remaining
  this.actionsTileValue.setText(state.player.actionsRemaining.toString());
  
  // Intel  count
  this.intelTileValue.setText(state.player.intel.toString());
  
  // Current city
  this.cityText.setText(`City: ${state.player.currentCity}`);
  
  // Timer (calculate elapsed)
  const elapsed = state.timeElapsedMs;
  const remaining = Math.max(0, 15000 - elapsed);
  this.timerDisplay.setRemaining(remaining);
  
  // Deep Cover indicator
  if (state.player.opponentUsedDeepCover) {
    this.opponentCoverText.setText("DEEP COVER ACTIVE");
    this.opponentCoverText.setColor("#ff0000");
  } else {
    this.opponentCoverText.setText("");
  }
}
```

---

## Error Recovery

### Validation by stitch-frontend (to reduce errors)

```typescript
// Don't send invalid actions
private validateAction(action: string, targetCity?: string): boolean {
  const state = this.state;
  const player = state.player;
  
  if (state.currentTurn !== this.playerSide) {
    console.warn("Not your turn");
    return false;
  }
  
  if (player.actionsRemaining === 0) {
    console.warn("No actions remaining");
    return false;
  }
  
  if (action === 'MOVE' && targetCity) {
    if (!this.isAdjacent(player.currentCity, targetCity)) {
      console.warn("Not adjacent");
      return false;
    }
  }
  
  if (action === 'STRIKE' && targetCity) {
    if (!this.isVisible(player.currentCity, targetCity)) {
      console.warn("Not visible");
      return false;
    }
  }
  
  return true;
}

private sendAction(action: string, targetCity?: string) {
  if (!this.validateAction(action, targetCity)) {
    return;  // Silent fail
  }
  
  network.send('PLAYER_ACTION', { action, targetCity });
}
```

### Handling Server Errors

```typescript
network.on('ERROR', (msg) => {
  const error = msg.payload.message;
  console.error("[ERROR]", error);
  
  // Show, user to console, don't crash
  toast.show(`Error: ${error}`, { duration: 3000, type: 'error' });
  
  // State unchanged — user can try again
});
```

### Connection Loss (Not Yet Implemented)

```typescript
private setupConnectionHandlers() {
  this.network.on('disconnect', () => {
    this.showModal("Connection lost. Attempting to reconnect...");
    this.attemptReconnect();
  });
  
  this.network.on('reconnect', () => {
    this.hideModal();
    this.syncState();
  });
  
  this.network.on('reconnect_failed', () => {
    this.showModal("Failed to reconnect. Game over.");
  });
}

private async attemptReconnect() {
  // TODO: Implement with exponential backoff
  // Re-establish WebSocket
  // Re-send sessionId/playerId
  // Request latest MATCH_STATE
}
```

---

## Complete Integration Summary

### Minimal Implementation (MVP)

To get a basic working game:

1. **Lobby (3 screens):**
   - Create Match (send `CREATE_MATCH`)
   - Join Match (send `JOIN_MATCH` with code)
   - Set Name (send `SET_PLAYER_NAME`)

2. **Game Board:**
   - Display map (from `MATCH_STATE.map`)
   - Show player & opponent positions
   - 4 action buttons: Move, Strike, Deep Cover, Locate

3. **Actions:**
   - Move: Select adjacent city → send `PLAYER_ACTION`
   - Strike: Select any city → send `PLAYER_ACTION`
   - Deep Cover: Send `PLAYER_ACTION` immediately
   - Locate: Send `PLAYER_ACTION` immediately
   - End Turn: Send `END_TURN`

4. **Feedback:**
   - Update HUD (actions, Intel, turn #)
   - Show banners for key events
   - Show opponent's known position
   - Show game over screen

### Full Implementation (Later Phases)

- Intel control tracking
- City disappearing mechanic
- All ability variants
- Reconnection logic
- Spectator mode
- Match history/replay

