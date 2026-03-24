#!/usr/bin/env node

/**
 * Debug: Check if `locateBlockedByDeepCover` field exists in response
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

async function test() {
  let ws = new WebSocket(WS_URL);

  await new Promise(r => ws.on('open', r));

  console.log('Creating match...');
  ws.send(JSON.stringify({ type: 'CREATE_MATCH', payload: {} }));

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'MATCH_STATE') {
      const p = msg.payload.player;

      console.log('\n=== PlayerState Fields ===');
      const allKeys = Object.keys(p).sort();
      allKeys.forEach(k => {
        if (typeof p[k] === 'boolean' || k.includes('locate') || k.includes('blocked')) {
          console.log(`${k}: ${p[k]}`);
        }
      });

      if ('locateBlockedByDeepCover' in p) {
        console.log('\n✅ locateBlockedByDeepCover field EXISTS');
      } else {
        console.log('\n❌ locateBlockedByDeepCover field NOT FOUND');
      }

      ws.close();
    }
  });
}

test();
