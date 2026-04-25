#!/usr/bin/env node

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

const red = new WebSocket(WS_URL);
const blue = new WebSocket(WS_URL);

red.on('open', () => {
  console.log('[RED] Connected');
  red.send(JSON.stringify({ type: 'CREATE_MATCH', payload: {} }));
});

blue.on('open', () => {
  console.log('[BLUE] Connected');
});

let redMatchCode;
let blueJoined = false;

red.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`[RED] Received: ${msg.type}`);
  
  if (msg.type === 'MATCH_START') {
    redMatchCode = msg.payload.code;
    setTimeout(() => {
      blue.send(JSON.stringify({ type: 'JOIN_MATCH', payload: { code: redMatchCode } }));
    }, 200);
  }
  
  if (msg.type === 'MATCH_STATE' && !blueJoined) {
    console.log('[RED] First state received, waiting for BLUE...');
  }
  
  if (msg.type === 'MATCH_STATE' && blueJoined) {
    console.log(`[RED] After Locate: locateBlockedByDeepCover=${msg.payload.player.locateBlockedByDeepCover}`);
    process.exit(0);
  }
});

blue.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log(`[BLUE] Received: ${msg.type}`);
  
  if (msg.type === 'MATCH_START') {
    blueJoined = true;
    // Now RED's turn 1
    setTimeout(() => {
      console.log('[Sequence] RED waits, BLUE deep covers, RED locates...');
      red.send(JSON.stringify({ type: 'PLAYER_ACTION', payload: { action: 'WAIT' } }));
    }, 300);
  }
});

setTimeout(() => {
  console.log('Timeout!');
  process.exit(1);
}, 10000);
