#!/usr/bin/env node

/**
 * Ultra-fast: Locate blocked test without waiting for unnecessary state
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';
let code;
let redWs, blueWs;

// Utility
function send(ws, msg) {
  ws.send(JSON.stringify(msg));
}

function onMessage(ws) {
  return new Promise(r => ws.once('message', d => r(JSON.parse(d.toString()))));
}

async function run() {
  try {
    console.log('Connecting...');
    redWs = new WebSocket(WS_URL);
    blueWs = new WebSocket(WS_URL);
    
    await  Promise.all([
      new Promise(r => redWs.on('open', r)),
      new Promise(r => blueWs.on('open', r))
    ]);
    
    console.log('Creating match...');
    send(redWs, { type: 'CREATE_MATCH', payload: {} });
    const matchStart = await onMessage(redWs);
    code = matchStart.payload.code;
    
    console.log(`Joining with code ${code}...`);
    send(blueWs, { type: 'JOIN_MATCH', payload: { code } });
    
    // Wait for both to get initial state
    console.log('Waiting for initial state...');
    const [initialRed, initialBlue] = await Promise.all([
      onMessage(redWs),
      onMessage(blueWs)
    ]);
    
    console.log(`Initial: turn=${initialRed.payload.turnNumber}, current=${initialRed.payload.currentTurn}`);
    
    const whoGoesFirst = initialRed.payload.currentTurn;
    const firstWs = whoGoesFirst === 'RED' ? redWs : blueWs;
    const secondWs = whoGoesFirst === 'RED' ? blueWs : redWs;
    
    // First player waits
    console.log('\nFirst player WAIT...');
    send(firstWs, { type: 'PLAYER_ACTION', payload: { action: 'WAIT' } });
    const afterWait = await onMessage(firstWs);
    console.log(`After WAIT: turn=${afterWait.payload.turnNumber}, current=${afterWait.payload.currentTurn}`);
    
    // Second player uses Deep Cover
    console.log('\nSecond player DEEP_COVER...');
    send(secondWs, { type: 'PLAYER_ACTION', payload: { action: 'ABILITY', abilityId: 'DEEP_COVER' } });
    const afterDC = await onMessage(secondWs);
    console.log(`After DC: turn=${afterDC.payload.turnNumber}, current=${afterDC.payload.currentTurn}, deepCoverActive=${afterDC.payload.player.deepCoverActive}`);
    
    // First player ends turn
    console.log('\nFirst player END_TURN...');
    send(firstWs, { type: 'END_TURN', payload: {} });
    const f_afterEnd1 = await onMessage(firstWs);
    console.log(`First after END_TURN: turn=${f_afterEnd1.payload.turnNumber}, current=${f_afterEnd1.payload.currentTurn}`);
    
    // Second player ends turn
    console.log('\nSecond player END_TURN...');
    send(secondWs, { type: 'END_TURN', payload: {} });
    const s_afterEnd2 = await onMessage(secondWs);
    console.log(`Second after END_TURN: turn=${s_afterEnd2.payload.turnNumber}, current=${s_afterEnd2.payload.currentTurn}`);
    
    // First player tries Locate
    console.log('\nFirst player LOCATE on second player...');
    send(firstWs, { type: 'PLAYER_ACTION', payload: { action: 'ABILITY', abilityId: 'LOCATE' } });
    const locateResponse = await onMessage(firstWs);
    console.log(`After LOCATE: turn=${locateResponse.payload.turnNumber}, current=${locateResponse.payload.currentTurn}`);
    
    console.log('\n=== RESULT ===');
    const flag = locateResponse.payload.player.locateBlockedByDeepCover;
    const city = locateResponse.payload.player.knownOpponentCity;
    
    console.log(`locateBlockedByDeepCover: ${flag}`);
    console.log(`knownOpponentCity: ${city || 'hidden'}`);
    
    if (flag && (!city || city === null)) {
      console.log('\n✅ SUCCESS!');
    } else {
      console.log('\n❌ FAIL!');
      console.log(`Expected: flag=true, city=null`);
      console.log(`Got: flag=${flag}, city=${city}`);
    }
    
    redWs.close();
    blueWs.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
