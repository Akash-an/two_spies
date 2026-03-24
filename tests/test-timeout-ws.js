#!/usr/bin/env node
/**
 * Direct WebSocket test for turn timeout behavior
 * 
 * This test connects as two players via WebSocket and verifies that
 * timeout automatically transfers control without any action being taken.
 */

const WebSocket = require('ws');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class GamePlayer {
  constructor(name, playerId) {
    this.name = name;
    this.playerId = playerId;
    this.ws = null;
    this.sessionId = null;
    this.messages = [];
    this.currentTurn = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:8080');
      
      this.ws.on('open', () => {
        console.log(`   [${this.name}] Connected to server`);
        resolve();
      });
      
      this.ws.on('message', (data) => {
        const msg = JSON.parse(data);
        this.messages.push(msg);
        
        if (msg.type === 'MATCH_STATE') {
          this.currentTurn = msg.payload?.currentTurn;
        }
        if (msg.type === 'TURN_CHANGE') {
          console.log(`   [${this.name}] TURN_CHANGE: ${msg.payload?.previousTurn} → ${msg.payload?.currentTurn} (reason: ${msg.payload?.reason})`);
        }
      });
      
      this.ws.on('error', reject);
    });
  }

  send(type, payload = {}) {
    const msg = {
      type,
      sessionId: this.sessionId || '',
      playerId: this.playerId,
      payload
    };
    this.ws.send(JSON.stringify(msg));
  }

  waitForMessage(type, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const msg = this.messages.find(m => m.type === type);
        if (msg) {
          clearInterval(checkInterval);
          resolve(msg);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Timeout waiting for ${type}`));
        }
      }, 100);
    });
  }

  extractMatchCode(msg) {
    // Match code is typically in the message somewhere
    return msg.payload?.code || msg.payload?.matchCode;
  }

  close() {
    return new Promise((resolve) => {
      this.ws.close();
      this.ws.on('close', resolve);
    });
  }
}

async function runTest() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       Turn Timeout WebSocket Test                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    console.log('1️⃣  Creating RED player...');
    const red = new GamePlayer('RED', 'player-red-' + Date.now());
    await red.connect();
    red.send('SET_PLAYER_NAME', { name: 'Red Spy' });
    
    console.log('2️⃣  Creating BLUE player...');
    const blue = new GamePlayer('BLUE', 'player-blue-' + Date.now());
    await blue.connect();
    blue.send('SET_PLAYER_NAME', { name: 'Blue Spy' });
    
    await sleep(500);
    
    // RED creates match
    console.log('\n2️⃣  RED creates a match...');
    red.send('CREATE_MATCH', {});
    const matchCreated = await red.waitForMessage('MATCH_CREATED', 5000);
    const matchCode = matchCreated.payload?.code;
    if (!matchCode) {
      throw new Error('Could not get match code');
    }
    red.sessionId = matchCreated.sessionId;
    console.log(`   ✓ Match created with code: ${matchCode}`);
    
    // BLUE joins match
    console.log('\n3️⃣  BLUE joins the match...');
    blue.send('JOIN_MATCH', { code: matchCode.toString() });
    const blueBoardState = await blue.waitForMessage('MATCH_STATE', 5000);
    blue.sessionId = blueBoardState.sessionId;
    console.log(`   ✓ BLUE joined`);
    
    // Wait for both to receive MATCH_START
    await sleep(1000);
    
    // Verify initial turn state
    console.log('\n4️⃣  Checking initial turn state...');
    const redHasTurn = red.currentTurn === 'RED';
    const blueHasTurn = blue.currentTurn === 'RED';
    console.log(`   RED sees: ${redHasTurn ? '📍 RED has turn' : '⏸ BLUE has turn'}`);
    console.log(`   BLUE sees: ${blueHasTurn ? '📍 RED has turn' : '⏸ BLUE has turn'}`);
    
    if (!redHasTurn || !blueHasTurn) {
      throw new Error('Initial turn state is wrong. RED should have first turn.');
    }
    console.log('   ✓ RED correctly has first turn\n');
    
    // Critical test: WAIT for timeout without sending any action
    console.log('5️⃣  🕐 WAITING FOR TIMEOUT (15 seconds)...');
    console.log('   RED will sit idle during their entire turn...');
    console.log('   No actions will be sent. Checking if control transfers automatically.\n');
    
    const timeoutStart = Date.now();
    let controlTransferred = false;
    let transferredAt = 0;
    
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const elapsed = Date.now() - timeoutStart;
      const seconds = Math.floor(elapsed / 1000);
      
      // Display progress bar
      const bar = '█'.repeat(Math.floor(seconds / 0.5)) + '░'.repeat(30 - Math.floor(seconds / 0.5));
      process.stdout.write(`\r   [${bar}] ${seconds}s elapsed`);
      
      // Check if TURN_CHANGE message was received
      const turnChangeMsg = red.messages.find(m => m.type === 'TURN_CHANGE');
      if (turnChangeMsg && !controlTransferred) {
        controlTransferred = true;
        transferredAt = elapsed;
        console.log(`\n\n   ✅ TURN_CHANGE received after ${seconds}s!`);
        console.log(`      Reason: ${turnChangeMsg.payload?.reason}`);
        break;
      }
      
      // Timeout after 20 seconds of waiting
      if (seconds > 20) {
        console.log('\n');
        throw new Error(`Timeout not detected after 20 seconds`);
      }
    }
    
    if (!controlTransferred) {
      throw new Error('Control did not transfer');
    }
    
    // Verify final state
    console.log('\n6️⃣  Verifying final turn state...');
    const redFinalTurn = red.currentTurn;
    const blueFinalTurn = blue.currentTurn;
    console.log(`   RED's view: ${redFinalTurn === 'BLUE' ? '⏸ BLUE has turn' : '❌ ' + redFinalTurn}`);
    console.log(`   BLUE's view: ${blueFinalTurn === 'BLUE' ? '📍 BLUE has turn' : '❌ ' + blueFinalTurn}`);
    
    if (redFinalTurn !== 'BLUE' || blueFinalTurn !== 'BLUE') {
      throw new Error('Final turn state is incorrect');
    }
    
    console.log('\n✅ SUCCESS: Turn timeout correctly transferred control automatically!\n');
    
    // Close connections
    await red.close();
    await blue.close();
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTest();
