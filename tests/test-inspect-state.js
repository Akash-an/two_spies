#!/usr/bin/env node

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

async function test() {
  const red = new WebSocket(WS_URL);
  const blue = new WebSocket(WS_URL);
  
  await Promise.all([
    new Promise(r => red.on('open', r)),
    new Promise(r => blue.on('open', r))
  ]);
  
  console.log('RED: Sending CREATE_MATCH...');
  red.send(JSON.stringify({ type: 'CREATE_MATCH', payload: {} }));
  
  const matchMsg = await new Promise(r => {
    red.once('message', d => r(JSON.parse(d.toString())));
  });
  
  const code = matchMsg.payload.code;
  console.log(`RED: Got code ${code}\n`);
  
  console.log('BLUE: Sending JOIN_MATCH...');
  blue.send(JSON.stringify({ type: 'JOIN_MATCH', payload: { code } }));
  
  // Get first MATCH_STATE
  const stateMsg = await new Promise(r => {
    let count = 0;
    const handler = (d) => {
      const msg = JSON.parse(d.toString());
      if (msg.type === 'MATCH_STATE') {
        count++;
        if (count === 1) {
          console.log('First MATCH_STATE from RED:');
          console.log('All keys:', Object.keys(msg.payload).sort());
          console.log('Player keys:', Object.keys(msg.payload.player).sort());
          r(msg);
        }
      }
    };
    red.on('message', handler);
  });
  
  console.log('\nPlayer state values:');
  Object.entries(stateMsg.payload.player).forEach(([k, v]) => {
    if (typeof v !== 'object') {
      console.log(`  ${k}: ${v}`);
    }
  });
  
  red.close();
  blue.close();
}

test().catch(console.error);

setTimeout(() => {
  console.log('Test timed out');
 process.exit(1);
}, 5000);
