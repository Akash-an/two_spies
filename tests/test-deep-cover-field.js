#!/usr/bin/env node

/**
 * Test: Verify opponentUsedDeepCover field exists in PlayerState
 * 
 * Creates a 2-player match and checks the first MATCH_STATE
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

async function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function test() {
  console.log('\n=== Testing Deep Cover Notification Field ===\n');

  let ws1 = null;
  let ws2 = null;

  try {
    // Connect first player
    console.log('📍 Player 1 connecting...');
    ws1 = new WebSocket(WS_URL);
    await new Promise((resolve, reject) => {
      ws1.on('open', resolve);
      ws1.on('error', reject);
    });
    console.log('✓ Player 1 connected\n');

    // Player 1 creates match
    console.log('📋 Player 1 creating match...');
    ws1.send(JSON.stringify({ type: 'CREATE_MATCH', payload: {} }));

    let matchCode = null;
    await new Promise((resolve) => {
      ws1.once('message', (data) => {
        const msg = JSON.parse(data);
        console.log(`   ← ${msg.type}`);
        if (msg.type === 'MATCH_CREATED') {
          matchCode = msg.payload?.code || msg.payload?.matchId || '1234';
          console.log(`   Match ID/Code: ${matchCode}\n`);
        }
        resolve();
      });
    });

    // Connect second player
    console.log('📍 Player 2 connecting...');
    ws2 = new WebSocket(WS_URL);
    await new Promise((resolve, reject) => {
      ws2.on('open', resolve);
      ws2.on('error', reject);
    });
    console.log('✓ Player 2 connected\n');

    // Player 2 joins
    console.log(`📋 Player 2 joining with code ${matchCode}...`);
    ws2.send(JSON.stringify({ type: 'JOIN_MATCH', payload: { code: matchCode } }));

    // Wait for MATCH_STATE from both
    console.log('Waiting for game state...\n');

    const msgs = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for MATCH_STATE')), 5000);
      const collected = [];

      const handler = (ws, data) => {
        const msg = JSON.parse(data);
        console.log(`   ← ${msg.type}`);
        if (msg.type === 'MATCH_STATE') {
          collected.push(msg);
          if (collected.length >= 2) {
            clearTimeout(timeout);
            resolve(collected);
          }
        }
      };

      ws1.on('message', d => handler(ws1, d));
      ws2.on('message', d => handler(ws2, d));
    });

    console.log('\n=== Analyzing MATCH_STATE ===\n');

    const state = msgs[0].payload;
    const player = state.player;

    console.log(`Turn: ${state.turnNumber}`);
    console.log(`Current Player: ${state.currentTurn}`);
    console.log(`Your Side: ${player.side}\n`);

    console.log('=== PlayerState Fields ===');
    const keys = Object.keys(player).sort();
    keys.forEach(k => {
      const val = player[k];
      if (typeof val === 'object') {
        console.log(`  ${k}: [Object]`);
      } else {
        console.log(`  ${k}: ${val}`);
      }
    });

    console.log('\n=== Key Test ===');
    if ('opponentUsedDeepCover' in player) {
      console.log(`✅ opponentUsedDeepCover FOUND: ${player.opponentUsedDeepCover}`);
    } else {
      console.log(`❌ opponentUsedDeepCover NOT FOUND in player state`);
    }

    if ('opponentUsedStrike' in player) {
      console.log(`✓ opponentUsedStrike exists: ${player.opponentUsedStrike}`);
    }

    if ('opponentUsedLocate' in player) {
      console.log(`✓ opponentUsedLocate exists: ${player.opponentUsedLocate}`);
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (ws1) ws1.close();
    if (ws2) ws2.close();
  }
}

test();
