#!/usr/bin/env node

/**
 * Test: Locate Blocked by Deep Cover Feedback
 * 
 * Verifies that when a player tries to use Locate on an opponent in Deep Cover,
 * the player receives feedback that their Locate failed.
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

async function test() {
  console.log('\n=== Testing Locate Blocked Feedback ===\n');

  let red = null;
  let blue = null;

  try {
    // Connect and create 2-player match
    console.log('📍 Connecting RED...');
    red = new WebSocket(WS_URL);
    await new Promise(r => red.on('open', r));

    console.log('📋 RED creates match...');
    red.send(JSON.stringify({ type: 'CREATE_MATCH', payload: {} }));

    let code = null;
    await new Promise(r => {
      red.once('message', (data) => {
        const msg = JSON.parse(data);
        if (msg.type === 'MATCH_CREATED') {
          code = msg.payload.code;
        }
        r();
      });
    });

    console.log('📍 Connecting BLUE...');
    blue = new WebSocket(WS_URL);
    await new Promise(r => blue.on('open', r));

    console.log(`🔗 BLUE joins with code ${code}...\n`);
    blue.send(JSON.stringify({ type: 'JOIN_MATCH', payload: { code } }));

    // Wait for MATCH_STATE from both
    const states = await new Promise(r => {
      const collected = [];
      const handler = (ws, d) => {
        const msg = JSON.parse(d);
        if (msg.type === 'MATCH_STATE') {
          collected.push(msg.payload);
          if (collected.length >= 2) r(collected);
        }
      };
      red.on('message', d => handler(red, d));
      blue.on('message', d => handler(blue, d));
    });

    const redState = states.find(s => s.player.side === 'RED');
    const blueState = states.find(s => s.player.side === 'BLUE');

    console.log('=== Initial State ===');
    console.log(`RED's state: locateBlockedByDeepCover=${redState.player.locateBlockedByDeepCover}`);
    console.log(`BLUE's state: locateBlockedByDeepCover=${blueState.player.locateBlockedByDeepCover}\n`);

    // Determine turn order
    const redGoesFirst = redState.currentTurn === 'RED';
    const firstPlayer = redGoesFirst ? 'RED' : 'BLUE';
    const secondPlayer = redGoesFirst ? 'BLUE' : 'RED';
    const firstWs = redGoesFirst ? red : blue;
    const secondWs = redGoesFirst ? blue : red;

    console.log(`📅 ${firstPlayer} goes first\n`);

    // If second player goes first, pass their turn
    if (!redGoesFirst) {
      console.log(`${firstPlayer} sending WAIT to let ${secondPlayer} play...`);
      firstWs.send(JSON.stringify({ type: 'PLAYER_ACTION', payload: { action: 'WAIT' } }));
      await new Promise(r => {
        const handler = (d) => {
          const msg = JSON.parse(d);
          if (msg.type === 'MATCH_STATE') {
            firstWs.removeListener('message', handler);
            r();
          }
        };
        firstWs.on('message', handler);
      });
      console.log('✓ First turn passed\n');
    }

    // Second player uses Deep Cover
    console.log(`=== ${secondPlayer} Uses Deep Cover ===`);
    console.log(`${secondPlayer} sending Deep Cover action...\n`);
    secondWs.send(JSON.stringify({ 
      type: 'PLAYER_ACTION', 
      payload: { action: 'ABILITY', abilityId: 'DEEP_COVER' } 
    }));

    // Receive state after Deep Cover
    await new Promise(r => {
      const handler = (d) => {
        const msg = JSON.parse(d);
        if (msg.type === 'MATCH_STATE') {
          secondWs.removeListener('message', handler);
          r();
        }
      };
      secondWs.on('message', handler);
    });

    console.log(`✓ ${secondPlayer} is now in Deep Cover\n`);

    // First player ends their turn
    console.log(`${firstPlayer} ending turn...`);
    firstWs.send(JSON.stringify({ type: 'END_TURN', payload: {} }));

    await new Promise(r => {
      const handler = (d) => {
        const msg = JSON.parse(d);
        if (msg.type === 'MATCH_STATE') {
          firstWs.removeListener('message', handler);
          r();
        }
      };
      firstWs.on('message', handler);
    });

    console.log(`✓ Turn passed to ${secondPlayer}\n`);

    // Second player ends turn
    console.log(`${secondPlayer} ending turn...`);
    secondWs.send(JSON.stringify({ type: 'END_TURN', payload: {} }));

    await new Promise(r => {
      const handler = (d) => {
        const msg = JSON.parse(d);
        if (msg.type === 'MATCH_STATE') {
          secondWs.removeListener('message', handler);
          r();
        }
      };
      secondWs.on('message', handler);
    });

    console.log(`✓ Turn passed back to ${firstPlayer}\n`);

    // First player uses Locate
    console.log(`=== ${firstPlayer} Uses Locate on ${secondPlayer} ===`);
    console.log(`${firstPlayer} has 10 Intel, trying to Locate opponent in Deep Cover...\n`);
    firstWs.send(JSON.stringify({ 
      type: 'PLAYER_ACTION', 
      payload: { action: 'ABILITY', abilityId: 'LOCATE' } 
    }));

    // Get the state after Locate attempt
    const locateState = await new Promise((r, rej) => {
      const timeout = setTimeout(() => {
        rej(new Error('Timeout waiting for MATCH_STATE after LOCATE'));
      }, 5000);
      const handler = (d) => {
        const msg = JSON.parse(d);
        if (msg.type === 'MATCH_STATE') {
          clearTimeout(timeout);
          firstWs.removeListener('message', handler);
          r(msg.payload);
        }
      };
      firstWs.on('message', handler);
    });

    console.log('=== After Locate Attempt ===');
    console.log(`${firstPlayer}'s locateBlockedByDeepCover: ${locateState.player.locateBlockedByDeepCover}`);
    console.log(`${firstPlayer}'s knownOpponentCity: ${locateState.player.knownOpponentCity || 'unknown'}\n`);

    // Verify the flag
    if (locateState.player.locateBlockedByDeepCover) {
      console.log('✅ SUCCESS! Locate blocked feedback received!');
      console.log('   Player sees that their Locate failed because opponent was in Deep Cover.');
    } else {
      console.log('❌ FAIL! locateBlockedByDeepCover should be true');
      console.log('   Player should see feedback that Locate was blocked.');
    }

    // Also verify opponent's location is NOT revealed
    if (!locateState.player.knownOpponentCity) {
      console.log('✅ Opponent location was NOT revealed (correct)');
    } else {
      console.log('❌ Opponent location was revealed (should be hidden)');
    }

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  } finally {
    if (red) red.close();
    if (blue) blue.close();
  }
}

test();
