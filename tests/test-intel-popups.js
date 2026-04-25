#!/usr/bin/env node
/**
 * test-intel-popups.js
 *
 * Test Intel pop-ups feature:
 * 1. Intel spawns randomly after 3-5 actions
 * 2. Intel is displayed on cities
 * 3. Player claiming Intel gets +10 Intel
 * 4. Claiming Intel blows cover
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:8080';

let intelSpawned = false;
let intelCity = null;

const red = new WebSocket(WS_URL);
const blue = new WebSocket(WS_URL);

let redState = null;
let blueState = null;
let actionCount = 0;

red.on('open', () => {
  console.log('[RED] Connected to server');
  red.send(JSON.stringify({ type: 'CREATE_MATCH', payload: {} }));
});

blue.on('open', () => {
  console.log('[BLUE] Connected to server');
});

red.on('message', handleRedMessage);
blue.on('message', handleBlueMessage);

function handleRedMessage(data) {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'MATCH_CREATED' || msg.type === 'MATCH_START') {
    console.log(`[RED] Received: ${msg.type}`);
    if (msg.payload && msg.payload.code) {
      setTimeout(() => {
        console.log('[SEQUENCE] Joining BLUE to match...');
        blue.send(JSON.stringify({ 
          type: 'JOIN_MATCH', 
          payload: { code: msg.payload.code } 
        }));
      }, 100);
    }
  } else if (msg.type === 'MATCH_STATE') {
    redState = msg.payload;
    
    console.log(`[RED] State #${msg.payload.turnNumber}: Intel popups=${msg.payload.intelPopups.length}, Intel=${msg.payload.player.intel}, Cover=${msg.payload.player.hasCover}`);
    
    // Check for spawned Intel
    if (msg.payload.intelPopups.length > 0 && !intelSpawned) {
      intelSpawned = true;
      intelCity = msg.payload.intelPopups[0].city;
      console.log(`\n[✓] INTEL SPAWNED at city: ${intelCity}, amount: ${msg.payload.intelPopups[0].amount}\n`);
    }
    
    // Navigate RED to Intel city if it exists
    if (intelSpawned && msg.payload.currentTurn === 'RED' && msg.payload.player.actionsRemaining > 0) {
      const redCity = msg.payload.player.currentCity;
      
      if (redCity === intelCity) {
        // End turn to claim Intel
        console.log('[RED] Reached Intel city! Ending turn to claim...');
        red.send(JSON.stringify({ type: 'END_TURN', payload: {} }));
      } else {
        // Find path to Intel city
        const adjacentCities = msg.payload.map.edges
          .filter(e => e.from === redCity)
          .map(e => e.to);
        
        let targetCity = null;
        if (adjacentCities.includes(intelCity)) {
          targetCity = intelCity;
        } else {
          targetCity = adjacentCities[0];
        }
        
        if (targetCity) {
          actionCount++;
          console.log(`[RED] Moving to ${targetCity} (action ${actionCount})`);
          red.send(JSON.stringify({
            type: 'PLAYER_ACTION',
            payload: { action: 'MOVE', targetCity }
          }));
        }
      }
    } else if (!intelSpawned && msg.payload.currentTurn === 'RED' && msg.payload.player.actionsRemaining > 0 && actionCount < 20) {
      // Keep taking actions to trigger Intel spawn
      const adjacentCities = msg.payload.map.edges
        .filter(e => e.from === msg.payload.player.currentCity)
        .map(e => e.to);
      
      if (adjacentCities.length > 0) {
        actionCount++;
        console.log(`[RED] Taking action ${actionCount} to trigger Intel spawn...`);
        red.send(JSON.stringify({
          type: 'PLAYER_ACTION',
          payload: { action: 'MOVE', targetCity: adjacentCities[0] }
        }));
      }
    }
  }
}

function handleBlueMessage(data) {
  const msg = JSON.parse(data.toString());
  
  if (msg.type === 'MATCH_START') {
    console.log('[BLUE] Match started');
  } else if (msg.type === 'MATCH_STATE') {
    blueState = msg.payload;
    
    // BLUE just waits for now
    if (msg.payload.currentTurn === 'BLUE' && msg.payload.player.actionsRemaining > 0) {
      console.log('[BLUE] Taking wait action...');
      blue.send(JSON.stringify({
        type: 'PLAYER_ACTION',
        payload: { action: 'WAIT' }
      }));
    }
  }
}

// Timeout after 30 seconds
setTimeout(() => {
  console.log('\n[ERROR] Test timeout - Intel may not have spawned');
  console.log(`Actions taken: ${actionCount}`);
  console.log(`Intel spawned: ${intelSpawned}`);
  if (redState) {
    console.log(`Red state Intel: ${redState.player.intel}`);
    console.log(`Red state cover: ${redState.player.hasCover}`);
    console.log(`Red state popups: ${redState.intelPopups.length}`);
  }
  process.exit(1);
}, 30000);

