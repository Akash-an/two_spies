#!/usr/bin/env node

/**
 * Simple: Trace Deep Cover + Locate without complex listeners
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

async function connect() {
  const ws = new WebSocket(WS_URL);
  return new Promise((resolve, reject) => {
    ws.on('open', () => resolve(ws));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('Connection timeout')), 5000);
  });
}

async function sendAndReceive(ws, message, waitFor) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Timeout waiting for ${waitFor}`));
      }
    }, 5000);

    const messageHandler = (data) => {
      try {
        const text = typeof data === 'string' ? data : data.toString();
        const msg = JSON.parse(text);
        
        if (msg.type === waitFor) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.off('message', messageHandler);
            resolve(msg);
          }
        }
      } catch (e) {
        // Parse error, keep listening
      }
    };

    ws.on('message', messageHandler);
    ws.send(JSON.stringify(message));
  });
}

async function main() {
  console.log('=== Tracing Deep Cover + Locate ===\n');
  
  // Connect RED
  const red = await connect();
  console.log('[RED] Connected');
  
  // Create match
  const createResp = await sendAndReceive(red, { type: 'CREATE_MATCH', payload: {} }, 'MATCH_START');
  const code = createResp.payload.code;
  console.log(`[RED] Created match ${code}\n`);
  
  // Connect BLUE
  const blue = await connect();
  console.log('[BLUE] Connected');
  
  const joinResp = await sendAndReceive(blue, { type: 'JOIN_MATCH', payload: { code } }, 'MATCH_START');
  console.log(`[BLUE] Joined match\n`);
  
  // === TURN 1: RED WAITS ===
  console.log('--- TURN 1: RED WAITS ---');
  const red_wait = await sendAndReceive(red, { type: 'PLAYER_ACTION', payload: { action: 'WAIT' } }, 'MATCH_STATE');
  console.log(`RED after WAIT: turn=${red_wait.payload.turnNumber}, current=${red_wait.payload.currentTurn}`);
  
  const blue_saw_wait = await new Promise(resolve => {
    blue.once('message', data => {
      const text = typeof data === 'string' ? data : data.toString();
      resolve(JSON.parse(text));
    });
  });
  console.log(`BLUE sees: turn=${blue_saw_wait.payload.turnNumber}, current=${blue_saw_wait.payload.currentTurn}\n`);
  
  // === END TURN 1 ===
  console.log('--- END TURN 1 ---');
  const red_end1 = await sendAndReceive(red, { type: 'END_TURN', payload: {} }, 'MATCH_STATE');
  console.log(`RED after end_turn: turn=${red_end1.payload.turnNumber}, current=${red_end1.payload.currentTurn}`);
  
  const blue_gets_turn = await new Promise(resolve => {
    blue.once('message', data => {
      const text = typeof data === 'string' ? data : data.toString();
      resolve(JSON.parse(text));
    });
  });
  console.log(`BLUE gets control: turn=${blue_gets_turn.payload.turnNumber}, current=${blue_gets_turn.payload.currentTurn}\n`);
  
  // === TURN 2: BLUE USES DEEP_COVER ===
  console.log('--- TURN 2: BLUE USES DEEP_COVER ---');
  const blue_dc = await sendAndReceive(blue, { type: 'PLAYER_ACTION', payload: { action: 'ABILITY', abilityId: 'DEEP_COVER' } }, 'MATCH_STATE');
  console.log(`BLUE after Deep Cover:`);
  console.log(`  opponentUsedDeepCover: ${blue_dc.payload.player.opponentUsedDeepCover}`);
  console.log(`  deepCoverActive: ${blue_dc.payload.player.deepCoverActive}`);
  
  const red_sees_dc = await new Promise(resolve => {
    red.once('message', data => {
      const text = typeof data === 'string' ? data : data.toString();
      resolve(JSON.parse(text));
    });
  });
  console.log(`RED sees:`);
  console.log(`  opponentUsedDeepCover: ${red_sees_dc.payload.player.opponentUsedDeepCover}\n`);
  
  // === END TURN 2 ===
  console.log('--- END TURN 2 ---');
  const blue_end2 = await sendAndReceive(blue, { type: 'END_TURN', payload: {} }, 'MATCH_STATE');
  console.log(`BLUE after end_turn: turn=${blue_end2.payload.turnNumber}, current=${blue_end2.payload.currentTurn}`);
  
  const red_gets_turn3 = await new Promise(resolve => {
    red.once('message', data => {
      const text = typeof data === 'string' ? data : data.toString();
      resolve(JSON.parse(text));
    });
  });
  console.log(`RED gets turn 3: turn=${red_gets_turn3.payload.turnNumber}, current=${red_gets_turn3.payload.currentTurn}\n`);
  
  // === TURN 3: RED USES LOCATE ===
  console.log('--- TURN 3: RED USES LOCATE ---');
  const red_locate = await sendAndReceive(red, { type: 'PLAYER_ACTION', payload: { action: 'ABILITY', abilityId: 'LOCATE' } }, 'MATCH_STATE');
  console.log(`RED after Locate:`);
  console.log(`  turn: ${red_locate.payload.turnNumber}`);
  console.log(`  locateBlockedByDeepCover: ${red_locate.payload.player.locateBlockedByDeepCover}`);
  console.log(`  knownOpponentCity: ${red_locate.payload.player.knownOpponentCity}`);
  
  const blue_sees_locate = await new Promise(resolve => {
    blue.once('message', data => {
      const text = typeof data === 'string' ? data : data.toString();
      resolve(JSON.parse(text));
    });
  });
  console.log(`BLUE sees:`);
  console.log(`  opponentUsedLocate: ${blue_sees_locate.payload.player.opponentUsedLocate}\n`);
  
  // === RESULT ===
  console.log('=== RESULT ===');
  if (red_locate.payload.player.locateBlockedByDeepCover) {
    console.log('✅ PASS: locateBlockedByDeepCover = true');
  } else {
    console.log('❌ FAIL: locateBlockedByDeepCover = false (expected true)');
  }
  
  if (!red_locate.payload.player.knownOpponentCity || red_locate.payload.player.knownOpponentCity === '' || red_locate.payload.player.knownOpponentCity === null) {
    console.log('✅ PASS: knownOpponentCity is empty (Locate blocked)');
  } else {
    console.log(`❌ FAIL: knownOpponentCity = ${red_locate.payload.player.knownOpponentCity} (expected empty)`);
  }
  
  red.close();
  blue.close();
}

main().catch(console.error);
