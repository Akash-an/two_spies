#!/usr/bin/env node

/**
 * Test: Deep Cover Notification Flow
 * 
 * Simulates two players in a game where RED uses Deep Cover,
 * and verifies that BLUE receives the opponentUsedDeepCover flag.
 */

const WebSocket = require('ws');
const assert = require('assert');

const WS_URL = 'ws://localhost:8080';
let redWs = null;
let blueWs = null;
let redMatchId = null;
let blueMatchId = null;
let redSessionId = null;
let blueSessionId = null;

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function sendMessage(ws, type, payload = {}) {
  return new Promise((resolve, reject) => {
    const msg = JSON.stringify({ type, payload });
    console.log(`  → Sending ${type}:`, JSON.stringify(payload));
    ws.send(msg, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function onMessage(ws, expectedType) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for ${expectedType}`));
    }, 5000);

    const handler = (data) => {
      try {
        const msg = JSON.parse(data);
        console.log(`  ← Received ${msg.type}`);
        if (msg.type === expectedType) {
          clearTimeout(timeout);
          ws.removeListener('message', handler);
          resolve(msg);
        }
      } catch (e) {
        reject(e);
      }
    };

    ws.on('message', handler);
  });
}

async function test() {
  console.log('\n=== Deep Cover Notification Flow Test ===\n');

  try {
    // 1. Connect both clients
    console.log('1. Connecting RED and BLUE clients...');
    redWs = new WebSocket(WS_URL);
    blueWs = new WebSocket(WS_URL);

    await new Promise((resolve) => {
      let connected = 0;
      const checkDone = () => {
        connected++;
        if (connected === 2) resolve();
      };
      redWs.on('open', checkDone);
      blueWs.on('open', checkDone);
    });
    console.log('  ✓ Both connected\n');

    // 2. RED creates match
    console.log('2. RED creates match...');
    await sendMessage(redWs, 'CREATE_MATCH', {});
    const created = await onMessage(redWs, 'MATCH_CREATED');
    redMatchId = created.payload.matchId;
    console.log(`  ✓ Match created: ${redMatchId}\n`);

    // 3. BLUE joins same match
    console.log('3. BLUE joins match...');
    await sendMessage(blueWs, 'JOIN_MATCH', { matchId: redMatchId });
    await onMessage(blueWs, 'MATCH_START');
    await onMessage(redWs, 'MATCH_START');
    console.log('  ✓ BLUE joined, both got MATCH_START\n');

    // 4. Get initial state
    console.log('4. Both players receive initial state...');
    const redStateMsg = await onMessage(redWs, 'MATCH_STATE');
    const blueStateMsg = await onMessage(blueWs, 'MATCH_STATE');
    
    redSessionId = redStateMsg.sessionId;
    blueSessionId = blueStateMsg.sessionId;
    
    const redState = redStateMsg.payload;
    const blueState = blueStateMsg.payload;
    
    console.log(`  RED state: turn=${redState.turnNumber}, player=${redState.player.side}, opponentUsedDeepCover=${redState.player.opponentUsedDeepCover}`);
    console.log(`  BLUE state: turn=${blueState.turnNumber}, player=${blueState.player.side}, opponentUsedDeepCover=${blueState.player.opponentUsedDeepCover}`);
    console.log('  ✓ Initial state received\n');

    // 5. Determine who goes first
    const redGoesFirst = redState.currentTurn === redState.player.side;
    const activePlayer = redGoesFirst ? 'RED' : 'BLUE';
    const waitingPlayer = redGoesFirst ? 'BLUE' : 'RED';
    console.log(`5. Turn assignment: ${activePlayer} goes first\n`);

    // 6. If BLUE is first, BLUE takes a WAIT action to pass turn to RED
    if (!redGoesFirst) {
      console.log('6. BLUE goes first - sending WAIT to pass turn to RED...');
      await sendMessage(blueWs, 'PLAYER_ACTION', { action: 'WAIT' });
      const blueEndTurn = await onMessage(blueWs, 'MATCH_STATE');
      console.log(`  BLUE WAIT sent, new turn: ${blueEndTurn.payload.currentTurn}\n`);
      
      // RED receives state update
      const redAfterBlueWait = await onMessage(redWs, 'MATCH_STATE');
      console.log(`  RED received state after BLUE's WAIT\n`);
    }

    // 7. RED uses Deep Cover
    console.log('7. RED uses Deep Cover ability...');
    await sendMessage(redWs, 'PLAYER_ACTION', { action: 'ABILITY', abilityId: 'DEEP_COVER' });
    
    // Both should receive state update
    const redDeepCoverState = await onMessage(redWs, 'MATCH_STATE');
    const blueDeepCoverState = await onMessage(blueWs, 'MATCH_STATE');
    
    console.log(`  RED's state after Deep Cover: opponentUsedDeepCover=${redDeepCoverState.payload.player.opponentUsedDeepCover}`);
    console.log(`  BLUE's state after RED's Deep Cover: opponentUsedDeepCover=${blueDeepCoverState.payload.player.opponentUsedDeepCover}`);
    
    // KEY ASSERTION: BLUE should see opponentUsedDeepCover = true
    assert.strictEqual(
      blueDeepCoverState.payload.player.opponentUsedDeepCover,
      true,
      'BLUE should see opponentUsedDeepCover=true when RED uses Deep Cover'
    );
    console.log('  ✓ BLUE correctly notified of RED\'s Deep Cover!\n');

    // 8. RED ends turn
    console.log('8. RED ends turn...');
    await sendMessage(redWs, 'END_TURN', {});
    const redEndTurnState = await onMessage(redWs, 'MATCH_STATE');
    const blueAfterRedEnds = await onMessage(blueWs, 'MATCH_STATE');
    
    console.log(`  After RED ends turn:`);
    console.log(`  RED's state: opponentUsedDeepCover=${redEndTurnState.payload.player.opponentUsedDeepCover}`);
    console.log(`  BLUE's state: opponentUsedDeepCover=${blueAfterRedEnds.payload.player.opponentUsedDeepCover}`);
    console.log('  Note: Flag should still show RED\'s Deep Cover was used this turn\n');

    console.log('✅ All Deep Cover notification tests passed!\n');

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  } finally {
    if (redWs) redWs.close();
    if (blueWs) blueWs.close();
  }
}

test();
