# Match Flow Testing Guide

## What Was Fixed

### 1. **Protocol Field Mismatch ✅**
   - Changed `roomCode` → `code` in stitch-frontend messages
   - Both CREATE_MATCH and JOIN_MATCH now send correct field names

### 2. **Missing Event Handler ✅**
   - Added `MATCH_START` listener in main.tsx
   - Both players now transition to game when match starts

### 3. **Enhanced Logging ✅**
   - Backend: Added logging for MATCH_START transmission (verifies messages are sent)
   - stitch-frontend: Enhanced WebSocketClient to log full JSON messages
   - stitch-frontend: Added generic message handler for debugging

### 4. **Error Handling ✅**
   - Better error messages displayed to user
   - Detailed WebSocket logging for troubleshooting

## How It Should Work Now

```
Player 1: Creates Match (code: XXXX)
         ↓ Sends CREATE_MATCH to backend
         ↓ Receives MATCH_CREATED
         ↓ Waits for opponent (WAITING_FOR_OPPONENT)
         
Player 2: Joins Match (code: XXXX)
         ↓ Sends JOIN_MATCH to backend
         ↓ Backend starts match
         
Both Players: Receive MATCH_START
            ↓ Transition to Phaser game screen
            ↓ Game begins!
```

## Testing Instructions

### Step 1: Start Services
```bash
# Terminal 1: Backend
cd /Users/akashan/projects/side_quest/two_spies
# Backend should already be running from rebuild

# Terminal 2: stitch-frontend
cd stitch-stitch-frontend
npx vite  # Runs on port 5174

# Optional: Monitor backend logs
tail -f backend/server.log | grep -E "\[Match|MATCH_START|Sending"
```

### Step 2: Manual Browser Test
1. Open two browser windows (or tabs with DevTools)
2. Both go to http://localhost:5174

**Player 1:**
- Enter codename: "AGENT_ONE"
- Click "ESTABLISH"
- Click "INITIATE OPERATION"
- **Note the generated frequency (e.g., 1954)**
- Wait for notification: "WAITING FOR OPPONENT..."
- Watch browser console for `[WS] ← Received: MATCH_START`

**Player 2:**
- Enter codename: "AGENT_TWO"
- Click "ESTABLISH"
- Click "LINK TO NETWORK"
- Enter frequency from Player 1
- Click connect/submit button
- Should see: `[WS] ← Received: MATCH_START`
- **Both should transition to Phaser game screen**

### Step 3: Console Logs To Watch For

#### In Browser Console (F12):
```
✓ [App] Connected to backend
✓ [WS] → Sending: CREATE_MATCH {...}
✓ [WS] ← Received: MATCH_CREATED {...}
✓ [App] Match created: {payload: {code: "XXXX"}}
✓ [WS] ← Received: MATCH_START {...}  ← CRITICAL!
✓ [App] Match started - both players ready: {...}
```

#### In Backend Logs:
```
✓ [Session player-XXX] Created match with code XXXX
✓ [MatchManager] player-YYY joined match match-ZZZ as BLUE
✓ [Match match-ZZZ] Started: RED=CITY BLUE=CITY
✓ [Match match-ZZZ] Sending MATCH_START to RED (player-XXX): {...}
✓ [Match match-ZZZ] Sending MATCH_START to BLUE (player-YYY): {...}
```

## Playwright Test

A comprehensive end-to-end test has been created:

```bash
cd stitch-stitch-frontend
npx playwright test tests/test-match-flow.spec.ts --headed
```

This test:
- Opens two browser contexts (simulating two players)
- Registers both players
- Player 1 creates a match
- Player 2 joins the match
- Verifies both receive MATCH_START
- Checks for Phaser game container visibility
- Collects and displays all relevant logs

##  Troubleshooting

| Problem | Solution |
|---------|----------|
| No MATCH_START received | Check backend logs for "Sending MATCH_START" |
| Players not transitioning to game | Verify `MATCH_START` handler in main.tsx is running |
| "Invalid room code" error | Ensure Player 2 entered exact code from Player 1 |
| WebSocket connection failed | Verify backend is running on port 8080 |
| stitch-frontend not updating | Hard refresh browser (Cmd+Shift+R on Mac) |
| Type errors in TypeScript | Run `npx tsc --noEmit` in stitch-stitch-frontend |

## Files Modified

1. **stitch-stitch-frontend/src/main.tsx**
   - Fixed field names: `roomCode` → `code`
   - Added MATCH_START handler for game transition
   - Added generic message listener for debugging

2. **stitch-stitch-frontend/src/network/WebSocketClient.ts**
   - Enhanced logging with full JSON message output

3. **backend/src/game/Match.cpp**
   - Added MATCH_START transmission logging

4. **stitch-stitch-frontend/tests/test-match-flow.spec.ts** (NEW)
   - Comprehensive Playwright end-to-end test

## Next Steps

1. ✅ Run manual test with two browser windows
2. ✅ Check console logs for MATCH_START messages
3. ✅ Verify both players see Phaser game screen
4. ✅ Run Playwright test: `npx playwright test tests/test-match-flow.spec.ts`
5. Report any issues with context from logs
