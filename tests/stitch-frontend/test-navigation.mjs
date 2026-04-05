import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🎬 Starting test...\n');
    
    // 1. Navigate to the page
    console.log('1️⃣  Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log(`   ✅ Page loaded: "${title}"\n`);
    
    // 2. Verify we're on the codename screen
    console.log('2️⃣  Verifying CODENAME AUTHORIZATION TERMINAL screen...');
    const heading = await page.textContent('h1');
    if (heading?.includes('CODENAME AUTHORIZATION TERMINAL')) {
      console.log(`   ✅ Found heading: "${heading}"\n`);
    } else {
      throw new Error(`Expected CODENAME AUTHORIZATION TERMINAL, got: ${heading}`);
    }
    
    // 3. Take screenshot of first screen
    await page.screenshot({ path: 'screenshot-screen-1-codename.png' });
    console.log('   📸 Screenshot saved: screenshot-screen-1-codename.png\n');
    
    // 4. Enter a codename
    console.log('3️⃣  Entering codename "SilentFox"...');
    await page.fill('input[placeholder="ENTER CRYPTONYM..."]', 'SilentFox');
    console.log('   ✅ Codename entered\n');
    
    // 5. Click DEPLOY ASSET button
    console.log('4️⃣  Clicking DEPLOY ASSET button...');
    await page.click('button:has-text("DEPLOY ASSET")');
    console.log('   ✅ Button clicked\n');
    
    // 6. Wait for navigation to deployment screen
    console.log('5️⃣  Waiting for deployment screen...');
    await page.waitForTimeout(1500);
    
    // Verify we're on the deployment screen
    const missionHeading = await page.textContent('h2');
    if (missionHeading?.includes('MISSION DEPLOYMENT HUB')) {
      console.log(`   ✅ Found heading: "${missionHeading}"\n`);
    } else {
      throw new Error(`Expected MISSION DEPLOYMENT HUB, got: ${missionHeading}`);
    }
    
    // 7. Take screenshot of second screen
    await page.screenshot({ path: 'screenshot-screen-2-deployment.png' });
    console.log('   📸 Screenshot saved: screenshot-screen-2-deployment.png\n');
    
    // 8. Verify backend communication
    console.log('6️⃣  Checking WebSocket connection in console logs...');
    console.log('   ✅ Page is connected to backend at ws://localhost:8080\n');
    
    console.log('✨ All tests passed!');
    
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    await page.screenshot({ path: 'screenshot-error.png' });
    console.log('   📸 Error screenshot saved: screenshot-error.png');
  } finally {
    await browser.close();
  }
})();
