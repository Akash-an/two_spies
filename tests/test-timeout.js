/**
 * Playwright test for turn timeout behavior
 * 
 * This test:
 * 1. Opens two browser windows (RED player, BLUE player)
 * 2. Both connect to the game
 * 3. RED starts their turn, then sits idle (no actions for 15+ seconds)
 * 4. Verifies that control automatically transfers to BLUE after timeout
 */

const { chromium } = require('playwright');

async function testTurnTimeout() {
  console.log('Starting Turn Timeout Test...\n');
  const browser = await chromium.launch({ headless: false });
  
  try {
    // ─── SETUP: Create two pages (RED and BLUE) ───
    console.log('1. Opening two browser windows...');
    const contextRed = await browser.createContext({
      viewport: { width: 900, height: 1080 }
    });
    const contextBlue = await browser.createContext({
      viewport: { width: 900, height: 1080 }
    });
    
    const pageRed = await contextRed.newPage();
    const pageBlue = await contextBlue.newPage();
    
    const gameUrl = 'http://localhost:5173';
    
    console.log(`   RED:  ${gameUrl}`);
    console.log(`   BLUE: ${gameUrl}\n`);
    
    // ─── Navigate both to game ───
    console.log('2. Navigating to game...');
    await pageRed.goto(gameUrl, { waitUntil: 'networkidle' });
    await pageBlue.goto(gameUrl, { waitUntil: 'networkidle' });
    console.log('   ✓ Both pages loaded\n');
    
    // ─── RED: Set name and CREATE MATCH ───
    console.log('3. RED creates a match...');
    await pageRed.fill('input[placeholder*="name" i]', 'RED_Player');
    await pageRed.click('button:has-text("Start Game")');
    
    // Wait for match code to appear
    await pageRed.waitForSelector('text=/code|Code|CODE/', { timeout: 5000 });
    const matchCodeText = await pageRed.textContent('body');
    const matchCodeMatch = matchCodeText.match(/code[:\s]+(\d+)/i);
    if (!matchCodeMatch) {
      throw new Error('Could not find match code');
    }
    const matchCode = matchCodeMatch[1];
    console.log(`   ✓ Created match with code: ${matchCode}\n`);
    
    // ─── BLUE: Set name and JOIN MATCH ───
    console.log('4. BLUE joins the match...');
    await pageBlue.fill('input[placeholder*="name" i]', 'BLUE_Player');
    await pageBlue.fill('input[placeholder*="code" i]', matchCode);
    await pageBlue.click('button:has-text("Join Game")');
    
    // Wait for game scene to load (will show board)
    await pageBlue.waitForSelector('text=/Turn|turn/i', { timeout: 8000 });
    console.log('   ✓ BLUE joined match\n');
    
    // ─── Wait a moment for initial state ───
    await pageRed.waitForTimeout(2000);
    
    // ─── Get initial turn state ───
    console.log('5. Checking initial turn state...');
    const redTurnBefore = await pageRed.evaluate(() => {
      const text = document.documentElement.innerText;
      return text.includes('Your Turn') || text.includes('your turn');
    });
    
    const blueTurnBefore = await pageBlue.evaluate(() => {
      const text = document.documentElement.innerText;
      return text.includes('Your Turn') || text.includes('your turn');
    });
    
    console.log(`   RED side: ${redTurnBefore ? '📍 YOUR TURN' : '⏸ Opponent\'s turn'}`);
    console.log(`   BLUE side: ${blueTurnBefore ? '📍 YOUR TURN' : '⏸ Opponent\'s turn'}`);
    
    if (!redTurnBefore || blueTurnBefore) {
      throw new Error('Initial turn state incorrect. RED should start, not BLUE.');
    }
    console.log('   ✓ RED correctly has first turn\n');
    
    // ─── CRITICAL TEST: Wait for timeout (15+ seconds) ───
    console.log('6. 🕐 Waiting for turn timeout (15 seconds)...');
    console.log('   RED will sit idle during their entire turn...');
    
    let secondsWaited = 0;
    const maxWait = 18000; // 18 seconds (15s + 3s buffer)
    const checkInterval = 1000; // Check every 1 second
    let controlTransferred = false;
    
    while (secondsWaited < maxWait && !controlTransferred) {
      await pageRed.waitForTimeout(checkInterval);
      secondsWaited += checkInterval;
      
      const secondsRemaining = Math.ceil((15000 - secondsWaited) / 1000);
      const dots = '█'.repeat(Math.ceil(secondsWaited / 1000)) + '░'.repeat(15 - Math.ceil(secondsWaited / 1000));
      process.stdout.write(`\r   [${dots}] ${Math.ceil(secondsWaited / 1000)}s elapsed`);
      
      // Check if control transferred to BLUE
      const blueTurnNow = await pageBlue.evaluate(() => {
        const text = document.documentElement.innerText;
        return text.includes('Your Turn') || text.includes('your turn');
      });
      
      if (blueTurnNow && secondsWaited > 12000) {
        controlTransferred = true;
      }
    }
    console.log('\n');
    
    if (!controlTransferred) {
      console.log('   ⚠️  TIMEOUT DID NOT TRANSFER CONTROL\n');
      console.log('   Checking current screen state...\n');
      const redScreen = await pageRed.evaluate(() => document.documentElement.innerText);
      const blueScreen = await pageBlue.evaluate(() => document.documentElement.innerText);
      console.log('   RED Screen:\n', redScreen.substring(0, 400));
      console.log('\n   BLUE Screen:\n', blueScreen.substring(0, 400));
      throw new Error('Control did not transfer after 15 seconds');
    }
    
    // ─── VERIFY FINAL STATE ───
    console.log('7. ✅ Verifying timeout transfer...');
    const redTurnAfter = await pageRed.evaluate(() => {
      const text = document.documentElement.innerText;
      return text.includes('Your Turn') || text.includes('your turn');
    });
    
    const blueTurnAfter = await pageBlue.evaluate(() => {
      const text = document.documentElement.innerText;
      return text.includes('Your Turn') || text.includes('your turn');
    });
    
    console.log(`   RED side: ${redTurnAfter ? '📍 YOUR TURN' : '⏸ Opponent\'s turn'}`);
    console.log(`   BLUE side: ${blueTurnAfter ? '📍 YOUR TURN' : '⏸ Opponent\'s turn'}`);
    
    if (redTurnAfter || !blueTurnAfter) {
      throw new Error('Final turn state incorrect after timeout.');
    }
    
    console.log('\n✅ SUCCESS: Turn timeout correctly transferred control to opponent!\n');
    
    // ─── Take screenshots ───
    console.log('8. Taking screenshots...');
    await pageRed.screenshot({ path: '/tmp/timeout-test-red.png' });
    await pageBlue.screenshot({ path: '/tmp/timeout-test-blue.png' });
    console.log('   ✓ Screenshots saved to /tmp/timeout-test-*.png\n');
    
    // ─── Cleanup ───
    await contextRed.close();
    await contextBlue.close();
    
    console.log('Test completed successfully! ✅');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testTurnTimeout();
