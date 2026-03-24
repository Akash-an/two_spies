/**
 * Test Deep Cover notifications and indicators
 * 
 * Scenario:
 * 1. RED uses Deep Cover ability
 * 2. BLUE should see notification and indicator
 * 3. RED should see confirmation banner
 */
const { chromium } = require('playwright');
const BASE_URL = 'http://localhost:5173';
const WS_URL = 'ws://localhost:8080';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.createContext();
  
  // Create two pages for RED and BLUE players
  const redPage = await context.newPage();
  const bluePage = await context.newPage();
  
  try {
    console.log('\n=== DEEP COVER NOTIFICATION TEST ===\n');
    
    // Open both interfaces
    console.log('1. Opening RED player interface...');
    await redPage.goto(BASE_URL);
    await redPage.waitForLoadState('networkidle');
    await sleep(2000);
    
    console.log('2. Opening BLUE player interface...');
    await bluePage.goto(BASE_URL);
    await bluePage.waitForLoadState('networkidle');
    await sleep(2000);
    
    // Check for session IDs
    const redSession = await redPage.locator('text=SESSION:').first().textContent();
    const blueSession = await bluePage.locator('text=SESSION:').first().textContent();
    console.log(`3. RED session: ${redSession}`);
    console.log(`   BLUE session: ${blueSession}`);
    
    // Wait for game to start
    console.log('\n4. Waiting for game to start...');
    await sleep(3000);
    
    // Take pre-deep-cover screenshot
    console.log('\n5. BEFORE Deep Cover usage');
    await redPage.screenshot({ path: '/tmp/deep-cover-before-red.png' });
    await bluePage.screenshot({ path: '/tmp/deep-cover-before-blue.png' });
    console.log('   Screenshots saved');
    
    // Find and click Deep Cover button on RED player
    console.log('\n6. RED player: Clicking DEEP COVER button...');
    const deepCoverBtn = redPage.locator('text=DEEP COVER').nth(0);
    const isVisible = await deepCoverBtn.isVisible({ timeout: 5000 });
    if (isVisible) {
      await deepCoverBtn.click();
      console.log('   ✓ DEEP COVER button clicked');
    } else {
      console.log('   ✗ DEEP COVER button not found or not visible');
      const allButtons = await redPage.locator('text=/MOVE|STRIKE|WAIT|DEEP|LOCATE|CONTROL/').all();
      console.log(`   Found ${allButtons.length} action buttons`);
      for (let btn of allButtons) {
        const text = await btn.textContent();
        console.log(`     - ${text}`);
      }
    }
    
    // Wait for banners
    console.log('\n7. Waiting for notifications...');
    await sleep(2000);
    
    // Take post-deep-cover screenshots
    console.log('\n8. AFTER Deep Cover usage');
    await redPage.screenshot({ path: '/tmp/deep-cover-after-red.png' });
    await bluePage.screenshot({ path: '/tmp/deep-cover-after-blue.png' });
    console.log('   Screenshots saved');
    
    // Check for player confirmation banner on RED
    console.log('\n9. Checking RED player for "DEEP COVER ACTIVATED" banner...');
    const redBanner = redPage.locator('text=DEEP COVER ACTIVATED');
    if (await redBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   ✓ RED sees "DEEP COVER ACTIVATED" banner');
    } else {
      console.log('   ✗ RED does not see "DEEP COVER ACTIVATED" banner');
    }
    
    // Check for opponent notification on BLUE
    console.log('\n10. Checking BLUE player for "OPPONENT USED DEEP COVER" banner...');
    const blueBanner = bluePage.locator('text=OPPONENT USED DEEP COVER');
    if (await blueBanner.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   ✓ BLUE sees "OPPONENT USED DEEP COVER" banner');
    } else {
      console.log('   ✗ BLUE does not see "OPPONENT USED DEEP COVER" banner');
    }
    
    // Check for indicator on BLUE
    console.log('\n11. Checking BLUE player for "OPPONENT IN DEEP COVER" indicator...');
    const blueIndicator = bluePage.locator('text=DEEP COVER');
    if (await blueIndicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   ✓ BLUE sees "OPPONENT IN DEEP COVER" indicator');
    } else {
      console.log('   ✗ BLUE does not see indicator');
    }
    
    // Check browser console for errors
    console.log('\n12. Checking browser console logs...');
    const redConsole = [];
    redPage.on('console', msg => {
      if (msg.text().includes('Deep Cover') || msg.text().includes('Opponent')) {
        redConsole.push(msg.text());
      }
    });
    const blueConsole = [];
    bluePage.on('console', msg => {
      if (msg.text().includes('Deep Cover') || msg.text().includes('Opponent')) {
        blueConsole.push(msg.text());
      }
    });
    
    console.log('\n=== TEST COMPLETE ===\n');
    console.log('Screenshots saved to:');
    console.log('  /tmp/deep-cover-before-red.png');
    console.log('  /tmp/deep-cover-before-blue.png');
    console.log('  /tmp/deep-cover-after-red.png');
    console.log('  /tmp/deep-cover-after-blue.png');
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

main();
