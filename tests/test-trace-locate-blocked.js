#!/usr/bin/env node

/**
 * Trace: Detailed logging of Deep Cover + Locate interaction
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

async function onMessage(ws, type) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), 5000);
    const handler = (data) => {
      try {
        // Handle both text and buffer
        const text = typeof data === 'string' ? data : data.toString();
        const msg = JSON.parse(text);
        if (msg.type === type) {
          clearTimeout(timeout);
          ws.removeEventListener('message', handler);
          resolve(msg);
        } else {
          console.log(`[${ws.id}] Skipping ${msg.type}, waiting for ${type}`);
        }
      } catch (e) {
        console.log(`[${ws.id}] Parse error: ${e.message}`);
      }
    };
    ws.addEventListener('message', handler);
  });
}

async function test() {
  // Create RED
  const redWs = new WebSocket(WS_URL);
  redWs.id = 'RED';
  redWs.binaryType = 'buffer';  // Force binary
  await new Promise(r => redWs.on('open', r));
  
  console.log('[RED] Connected');
  redWs.send(JSON.stringify({ type: 'CREATE_MATCH', payload: {} }));
  
  const matchMsg = await onMessage(redWs, 'MATCH_START');
  const code = matchMsg.payload.code;
  console.log(`[RED] Created match ${code}`);
  
  const initialRedState = await onMessage(redWs, 'MATCH_STATE');
  console.log(`[RED] Initial state received`);
  console.log(`     Turn: ${initialRedState.payload.turnNumber}`);
  console.log(`     Current: ${initialRedState.payload.currentTurn}`);
  console.log(`     Deep Cover Active: ${initialRedState.payload.player.deepCoverActive}`);
  
  // Create BLUE
  const blueWs = new WebSocket(WS_URL);
  blueWs.id = 'BLUE';
  blueWs.binaryType = 'buffer';  // Force binary
  await new Promise(r => blueWs.on('open', r));
  
  console.log('[BLUE] Connected');
  blueWs.send(JSON.stringify({ type: 'JOIN_MATCH', payload: { code } }));
  
  const blueJoin = await onMessage(blueWs, 'MATCH_START');
  console.log(`[BLUE] Joined match`);
  
  const initialBlueState = await onMessage(blueWs, 'MATCH_STATE');
  console.log(`[BLUE] Initial state received\n`);
  
  // --- TURN 1: RED WAITS ---
  console.log('=== TURN 1: RED WAITS ===');
  redWs.send(JSON.stringify({ type: 'PLAYER_ACTION', payload: { action: 'WAIT' } }));
  
  const redAfterWait = await onMessage(redWs, 'MATCH_STATE');
  console.log(`[RED] After WAIT:`);
  console.log(`     Turn: ${redAfterWait.payload.turnNumber}`);
  console.log(`     Current: ${redAfterWait.payload.currentTurn}`);
  
  const blueAfterRedWait = await onMessage(blueWs, 'MATCH_STATE');
  console.log(`[BLUE] After RED waits:`);
  console.log(`     Turn: ${blueAfterRedWait.payload.turnNumber}`);
  console.log(`     Current: ${blueAfterRedWait.payload.currentTurn}\n`);
  
  // --- END TURN 1 ---
  console.log('=== END TURN 1 ===');
  redWs.send(JSON.stringify({ type: 'END_TURN', payload: {} }));
  
  const redEndTurn1 = await onMessage(redWs, 'MATCH_STATE');
  console.log(`[RED] After end_turn:`);
  console.log(`     Turn: ${redEndTurn1.payload.turnNumber}`);
  console.log(`     Current: ${redEndTurn1.payload.currentTurn}\n`);
  
  const blueGetsControl = await onMessage(blueWs, 'MATCH_STATE');
  console.log(`[BLUE] Gets control:`);
  console.log(`     Turn: ${blueGetsControl.payload.turnNumber}`);
  console.log(`     Current: ${blueGetsControl.payload.currentTurn}\n`);
  
  // --- TURN 2: BLUE USES DEEP_COVER ---
  console.log('=== TURN 2: BLUE USES DEEP_COVER ===');
  blueWs.send(JSON.stringify({ type: 'PLAYER_ACTION', payload: { action: 'ABILITY', abilityId: 'DEEP_COVER' } }));
  
  const blueAfterDeepCover = await onMessage(blueWs, 'MATCH_STATE');
  console.log(`[BLUE] After use_ability(DEEP_COVER):`);
  console.log(`     Turn: ${blueAfterDeepCover.payload.turnNumber}`);
  console.log(`     Deep Cover Active: ${blueAfterDeepCover.payload.player.deepCoverActive}`);
  console.log(`     opponentUsedDeepCover: ${blueAfterDeepCover.payload.player.opponentUsedDeepCover}`);
  
  const redSeesDeepCover = await onMessage(redWs, 'MATCH_STATE');
  console.log(`[RED] Sees opponent Deep Cover:`);
  console.log(`     opponentUsedDeepCover: ${redSeesDeepCover.payload.player.opponentUsedDeepCover}\n`);
  
  // --- END TURN 2 ---
  console.log('=== END TURN 2 ===');
  blueWs.send(JSON.stringify({ type: 'END_TURN', payload: {} }));
  
  const blueEndTurn2 = await onMessage(blueWs, 'MATCH_STATE');
  console.log(`[BLUE] After end_turn:`);
  console.log(`     Turn: ${blueEndTurn2.payload.turnNumber}`);
  console.log(`     Current: ${blueEndTurn2.payload.currentTurn}`);
  
  const redGetsTurn3 = await onMessage(redWs, 'MATCH_STATE');
  console.log(`[RED] Gets turn 3:`);
  console.log(`     Turn: ${redGetsTurn3.payload.turnNumber}`);
  console.log(`     Current: ${redGetsTurn3.payload.currentTurn}\n`);
  
  // --- TURN 3: RED USES LOCATE ---
  console.log('=== TURN 3: RED USES LOCATE ===');
  redWs.send(JSON.stringify({ type: 'PLAYER_ACTION', payload: { action: 'ABILITY', abilityId: 'LOCATE' } }));
  
  const redAfterLocate = await onMessage(redWs, 'MATCH_STATE');
  console.log(`[RED] After use_ability(LOCATE):`);
  console.log(`     Turn: ${redAfterLocate.payload.turnNumber}`);
  console.log(`     locateBlockedByDeepCover: ${redAfterLocate.payload.player.locateBlockedByDeepCover}`);
  console.log(`     knownOpponentCity: ${redAfterLocate.payload.player.knownOpponentCity}`);
  
  const blueSeesLocate = await onMessage(blueWs, 'MATCH_STATE');
  console.log(`[BLUE] Sees RED's Locate:`);
  console.log(`     Turn: ${blueSeesLocate.payload.turnNumber}`);
  console.log(`     opponentUsedLocate: ${blueSeesLocate.payload.player.opponentUsedLocate}\n`);
  
  // --- Check the actual result ---
  console.log('=== RESULT ===');
  if (redAfterLocate.payload.player.locateBlockedByDeepCover) {
    console.log('✅ PASS: locateBlockedByDeepCover = true');
  } else {
    console.log('❌ FAIL: locateBlockedByDeepCover = false (should be true)');
  }
  
  if (redAfterLocate.payload.player.knownOpponentCity === '' ||  !redAfterLocate.payload.player.knownOpponentCity) {
    console.log('✅ PASS: knownOpponentCity not revealed (blocked)');
  } else {
    console.log(`❌ FAIL: knownOpponentCity = ${redAfterLocate.payload.player.knownOpponentCity} (should be empty)`);
  }
  
  redWs.close();
  blueWs.close();
}

test().catch(console.error);
