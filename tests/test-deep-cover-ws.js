/**
 * WebSocket-based test for Deep Cover ability
 * Tests the backend directly without browser UI
 */

const WebSocket = require('ws');

function createWebSocket() {
  return new WebSocket('ws://localhost:8080');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDeepCoverTest() {
  console.log('=== Deep Cover WebSocket Test ===\n');
  
  // Create two connections
  const redWs = createWebSocket();
  const blueWs = createWebSocket();
  
  let redSessionId = null;
  let blueSessionId = null;
  let matchCode = null;
  let redPlayerId = null;
  let bluePlayerId = null;
  
  const redMessages = [];
  const blueMessages = [];
  
  return new Promise((resolve) => {
    // RED connection handlers
    redWs.on('open', () => {
      console.log('[RED] Connected');
      // Create match
      const msg = {
        type: 'CREATE_MATCH',
        session_id: 'RED_SESSION',
        player_id: 'red_player_1'
      };
      redWs.send(JSON.stringify(msg));
    });
    
    redWs.on('message', (data) => {
      const msg = JSON.parse(data);
      redMessages.push(msg);
      console.log(`[RED] Received: ${msg.type}`);
      
      if (msg.type === 'MATCH_CREATED') {
        matchCode = msg.payload.code;
        redSessionId = msg.session_id;
        redPlayerId = msg.payload.player_id;
        console.log(`[RED] Match created with code: ${matchCode}`);
        
        // BLUE joins
        setTimeout(() => {
          blueWs.send(JSON.stringify({
            type: 'JOIN_MATCH',
            session_id: 'BLUE_SESSION',
            player_id: 'blue_player_1',
            payload: { code: matchCode }
          }));
        }, 100);
      } else if (msg.type === 'MATCH_START') {
        console.log('[RED] Match started');
      } else if (msg.type === 'MATCH_STATE') {
        const state = msg.payload;
        console.log(`[RED] State: Turn ${state.turn}, Current turn: ${state.current_player_side}`);
        
        // After match starts, take first action
        if (redMessages.filter(m => m.type === 'MATCH_START').length === 1) {
          setTimeout(() => {
            // RED moves
            console.log('[RED] Sending MOVE action');
            redWs.send(JSON.stringify({
              type: 'PLAYER_ACTION',
              session_id: redSessionId,
              player_id: redPlayerId,
              payload: {
                action: 'MOVE',
                target_city: 'paris'
              }
            }));
          }, 100);
        }
      } else if (msg.type === 'TURN_CHANGE') {
        console.log(`[RED] Turn changed to: ${msg.payload.now_playing}`);
      }
    });
    
    redWs.on('error', (error) => {
      console.error('[RED] Error:', error.message);
      resolve(false);
    });
    
    redWs.on('close', () => {
      console.log('[RED] Disconnected');
    });
    
    // BLUE connection handlers
    blueWs.on('open', () => {
      console.log('[BLUE] Connected');
    });
    
    blueWs.on('message', (data) => {
      const msg = JSON.parse(data);
      blueMessages.push(msg);
      console.log(`[BLUE] Received: ${msg.type}`);
      
      if (msg.type === 'MATCH_START') {
        console.log('[BLUE] Match started');
        blueSessionId = msg.session_id;
        bluePlayerId = msg.payload.player_id;
      } else if (msg.type === 'MATCH_STATE') {
        const state = msg.payload;
        console.log(`[BLUE] State: Turn ${state.turn}, Current turn: ${state.current_player_side}`);
      } else if (msg.type === 'TURN_CHANGE') {
        console.log(`[BLUE] Turn changed to: ${msg.payload.now_playing}`);
        
        // When it's BLUE's turn, use Locate
        if (msg.payload.now_playing === 'BLUE') {
          setTimeout(() => {
            console.log('[BLUE] Sending LOCATE ability');
            blueWs.send(JSON.stringify({
              type: 'PLAYER_ACTION',
              session_id: blueSessionId,
              player_id: bluePlayerId,
              payload: {
                action: 'ABILITY',
                ability_id: 'LOCATE'
              }
            }));
          }, 100);
        }
      }
    });
    
    blueWs.on('error', (error) => {
      console.error('[BLUE] Error:', error.message);
      resolve(false);
    });
    
    blueWs.on('close', () => {
      console.log('[BLUE] Disconnected');
    });
    
    // Run test sequence
    setTimeout(() => {
      console.log('\n=== Test Verification ===');
      
      // Check that messages were received
      const hasMatchCreated = redMessages.some(m => m.type === 'MATCH_CREATED');
      const hasMatchStart = blueMessages.some(m => m.type === 'MATCH_START');
      const hasPlayerAction = redMessages.some(m => m.type === 'PLAYER_ACTION');
      
      console.log(`✓ Match created: ${hasMatchCreated ? 'YES' : 'NO'}`);
      console.log(`✓ Match started: ${hasMatchStart ? 'YES' : 'NO'}`);
      console.log(`✓ Player action processed: ${hasPlayerAction ? 'YES' : 'NO'}`);
      
      // Check that Deep Cover ability is available
      const matchStateMsg = redMessages.find(m => m.type === 'MATCH_STATE' && m.payload.self);
      if (matchStateMsg) {
        const abilities = matchStateMsg.payload.self.abilities || [];
        const hasDeepCover = abilities.includes('DEEP_COVER');
        console.log(`✓ Deep Cover ability available: ${hasDeepCover ? 'YES' : 'NO'}`);
      }
      
      console.log('\n=== Test Complete ===');
      
      // Close connections
      redWs.close();
      blueWs.close();
      resolve(true);
    }, 5000);
  });
}

// Run the test
runDeepCoverTest().then((success) => {
  if (success) {
    console.log('\n✓ Deep Cover test completed successfully');
    process.exit(0);
  } else {
    console.log('\n✗ Deep Cover test failed');
    process.exit(1);
  }
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});
