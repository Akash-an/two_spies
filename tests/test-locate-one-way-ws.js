#!/usr/bin/env node

const WebSocket = require('ws');

const SERVER_URL = 'ws://localhost:8080';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('Testing LOCATE one-way reveal behavior...\n');
    
    let blue_ws, red_ws;
    let blue_match_id, red_match_id;
    let blue_player_id, red_player_id;
    let game_started = false;
    
    try {
        // Connect both players
        console.log('Connecting blue player...');
        blue_ws = new WebSocket(SERVER_URL);
        
        console.log('Connecting red player...');
        red_ws = new WebSocket(SERVER_URL);
        
        // Wait for connections to be ready
        await new Promise(resolve => {
            let ready = 0;
            blue_ws.on('open', () => {
                console.log('Blue connected');
                ready++;
                if (ready === 2) resolve();
            });
            red_ws.on('open', () => {
                console.log('Red connected');
                ready++;
                if (ready === 2) resolve();
            });
        });
        
        // Join match with both players
        let match_established = false;
        await new Promise(resolve => {
            blue_ws.on('message', (data) => {
                const msg = JSON.parse(data);
                console.log('Blue received:', msg.type);
                
                if (msg.type === 'MATCH_START') {
                    blue_match_id = msg.payload.matchId;
                    blue_player_id = msg.payload.playerId;
                    game_started = true;
                    if (match_established) resolve();
                    match_established = true;
                }
            });
            
            red_ws.on('message', (data) => {
                const msg = JSON.parse(data);
                console.log('Red received:', msg.type);
                
                if (msg.type === 'MATCH_START') {
                    red_match_id = msg.payload.matchId;
                    red_player_id = msg.payload.playerId;
                    if (match_established) resolve();
                    match_established = true;
                }
            });
            
            // Join match
            console.log('Joining match...');
            blue_ws.send(JSON.stringify({ type: 'JOIN_MATCH' }));
            red_ws.send(JSON.stringify({ type: 'JOIN_MATCH' }));
        });
        
        console.log('\nMatch started!');
        console.log('Blue match:', blue_match_id, 'player:', blue_player_id);
        console.log('Red match:', red_match_id, 'player:', red_player_id);
        
        await wait(500);
        
        // Get initial game state
        let blue_state, red_state;
        await new Promise(resolve => {
            let got_state = 0;
            blue_ws.on('message', (data) => {
                const msg = JSON.parse(data);
                if (msg.type === 'MATCH_STATE') {
                    blue_state = msg.payload;
                    console.log('\nBlue initial state: player at', blue_state.player.currentCity);
                    got_state++;
                    if (got_state === 2) resolve();
                }
            });
            
            red_ws.on('message', (data) => {
                const msg = JSON.parse(data);
                if (msg.type === 'MATCH_STATE') {
                    red_state = msg.payload;
                    console.log('Red initial state: player at', red_state.player.currentCity);
                    got_state++;
                    if (got_state === 2) resolve();
                }
            });
        });
        
        // Move BLUE (first player is RED, second is BLUE)
        console.log('\nRed\'s turn - moving to paris...');
        red_ws.send(JSON.stringify({
            type: 'PLAYER_ACTION',
            payload: { action: 'MOVE', targetCity: 'paris' }
        }));
        
        await wait(500);
        
        // End RED's turn
        red_ws.send(JSON.stringify({ type: 'END_TURN' }));
        
        await wait(500);
        
        // Move BLUE
        console.log('Blue\'s turn - moving to berlin...');
        blue_ws.send(JSON.stringify({
            type: 'PLAYER_ACTION',
            payload: { action: 'MOVE', targetCity: 'berlin' }
        }));
        
        await wait(500);
        
        // Use LOCATE
        console.log('\nBlue using LOCATE ability...');
        blue_ws.send(JSON.stringify({
            type: 'PLAYER_ACTION',
            payload: { action: 'ABILITY', abilityId: 'LOCATE' }
        }));
        
        await wait(1000);
        
        // Collect latest states
        blue_state = null;
        red_state = null;
        
        await new Promise(resolve => {
            let got_state = 0;
            
            const check_blue = (data) => {
                const msg = JSON.parse(data);
                if (msg.type === 'MATCH_STATE') {
                    blue_state = msg.payload;
                    console.log('\nBlue state after LOCATE:');
                    console.log('  - Blue at:', blue_state.player.currentCity);
                    console.log('  - Blue knows opponent at:', blue_state.player.knownOpponentCity || '(unknown)');
                    console.log('  - Opponent used locate:', blue_state.player.opponentUsedLocate);
                    
                    blue_ws.removeListener('message', check_blue);
                    got_state++;
                    if (got_state === 2) resolve();
                }
            };
            
            const check_red = (data) => {
                const msg = JSON.parse(data);
                if (msg.type === 'MATCH_STATE') {
                    red_state = msg.payload;
                    console.log('\nRed state after Blue uses LOCATE:');
                    console.log('  - Red at:', red_state.player.currentCity);
                    console.log('  - Red knows opponent at:', red_state.player.knownOpponentCity || '(unknown)');
                    console.log('  - Red was notified of locate:', red_state.player.opponentUsedLocate);
                    
                    red_ws.removeListener('message', check_red);
                    got_state++;
                    if (got_state === 2) resolve();
                }
            };
            
            blue_ws.on('message', check_blue);
            red_ws.on('message', check_red);
        });
        
        // Verify results
        console.log('\n=== VERIFICATION ===\n');
        
        let pass = true;
        
        // Blue should know Red's location
        if (blue_state.player.knownOpponentCity === 'paris') {
            console.log('✓ BLUE knows RED is at paris');
        } else {
            console.log('✗ BLUE does not know RED is at paris (got: ' + (blue_state.player.knownOpponentCity || 'unknown') + ')');
            pass = false;
        }
        
        // Red should NOT know Blue's location (one-way!)
        if (!red_state.player.knownOpponentCity || red_state.player.knownOpponentCity === '') {
            console.log('✓ RED does not know BLUE\'s location (one-way reveal)');
        } else {
            console.log('✗ RED knows BLUE\'s location: ' + red_state.player.knownOpponentCity + ' (should be empty!)');
            pass = false;
        }
        
        // Red should be notified
        if (red_state.player.opponentUsedLocate === true) {
            console.log('✓ RED is notified that opponent used LOCATE');
        } else {
            console.log('✗ RED is not notified of LOCATE usage');
            pass = false;
        }
        
        console.log('\n' + (pass ? '✓ All checks passed!' : '✗ Some checks failed!'));
        
        blue_ws.close();
        red_ws.close();
        
        process.exit(pass ? 0 : 1);
        
    } catch (error) {
        console.error('Error:', error);
        if (blue_ws) blue_ws.close();
        if (red_ws) red_ws.close();
        process.exit(1);
    }
}

runTest();
