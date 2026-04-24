# Match Code Display - Debugging Guide

## Problem
- Backend generates code (e.g., 2344)
- Frontend displays different code (e.g., 1777)
- **Expected**: Displayed code should match backend code

## Testing Steps

### Step 1: Start Services
```bash
# Terminal 1: Backend
tail -f backend/server.log | grep -E "created match|MATCH_CREATED|code:"

# Terminal 2: Frontend  
cd stitch-frontend
npx vite
# Runs on http://localhost:5174
```

### Step 2: Test Manual Flow
1. Open browser to http://localhost:5174
2. Open DevTools (F12)
3. Go to Console tab
4. Register codename
5. Click "ESTABLISH"
6. Click "INITIATE OPERATION"
7. **Note the frequency displayed in the modal**

### Step 3: Check Logs

#### In Browser Console, Look For:
```
✓ [App] Match created: {payload: {code: 'XXXX'}, ...}
✓ [MissionDeploymentHub] Match code received: XXXX
```

#### In Backend Log, Look For:
```
[MatchManager] player-... created match match-... (code: XXXX)
[Match match-...] Sending MATCH_START to RED...
```

### Step 4: Compare Codes

**Compare these three values:**
1. Backend generated code (from backend log)
2. Code received by frontend (from [App] Match created console log)
3. Code displayed in modal (what you see on screen)

**Expected**: All three should be identical

### Step 5: If Codes Don't Match

Run the Playwright test:
```bash
cd stitch-frontend
npx playwright test tests/test-two-player-display-code.spec.ts --headed
```

This will:
- Extract all three codes
- Report if they match or differ
- Show detailed logs for diagnosis

## Code Flow Analysis

### Backend Side
```
Session receives: CREATE_MATCH {}
    ↓
MatchManager::create_match() called
    ↓
Generates code: auto code = generate_room_code();
    ↓
Creates JSON: {{"code", code}}
    ↓
Sends MATCH_CREATED with code
```

### Frontend Side
```
User clicks "INITIATE OPERATION"
    ↓
handleInitiateOperation() called
    ↓
Sends: CREATE_MATCH {} (no payload)
    ↓
Backend generates code and sends back
    ↓
MATCH_CREATED received with code
    ↓
setMatchCode(code) stores it
    ↓
MissionDeploymentHub receives matchCode prop
    ↓
Modal displays matchCode value
```

## If the Issue Persists

Check these specific things:

### 1. Verify matchCode State is Updated
Add to main.tsx after `setMatchCode(code)`:
```typescript
console.log('[Debug] matchCode state updated to:', code);
```

### 2. Verify Prop is Passed
Add to MissionDeploymentHub props:
```typescript
console.log('[Debug] MissionDeploymentHub received matchCode prop:', matchCode);
```

### 3. Verify Modal Display
The modal should only show when:
- `showGeneratedFrequencyModal === true`
- `matchCode` is not null

Check in MissionDeploymentHub:
```typescript
console.log('[Debug] Modal should show?', showGeneratedFrequencyModal && matchCode);
```

## Quick Checklist

- [ ] Backend running and generating matches
- [ ] Frontend receiving MATCH_CREATED messages
- [ ] matchCode state is being set
- [ ] matchCode prop is passed to MissionDeploymentHub
- [ ] Modal shows correct code from prop
- [ ] Both players can join using displayed code

## Expected Console Output

```
[App] Connected to backend
[WS] → Sending: CREATE_MATCH {}
[App] Generic message handler - type: MATCH_CREATED
[App] Match created: {payload: {code: '2344'}, sessionId: 'match-...', type: 'MATCH_CREATED'}
[MissionDeploymentHub] Match code received: 2344
✓ Modal displays: 2344

[App] Generic message handler - type: WAITING_FOR_OPPONENT
[App] Waiting for opponent: ...
```

## Success Criteria

✅ Displayed code matches backend code
✅ Player 2 can join using displayed code
✅ Both players transition to game
✅ Console has no related errors
