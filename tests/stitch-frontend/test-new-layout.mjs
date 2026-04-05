import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🎬 Testing new mission deployment hub layout...\n');
    
    // Navigate to app
    console.log('📍 Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    // Take screenshot of codename screen
    console.log('📸 Capturing codename authorization terminal...');
    await page.screenshot({ path: 'screenshot-codename-new.png', fullPage: true });
    console.log('✅ Saved: screenshot-codename-new.png\n');

    // Enter codename and click deploy
    console.log('⌨️  Entering codename "ShadowFox"...');
    await page.fill('input[type="text"]', 'ShadowFox');
    console.log('✅ Codename entered\n');

    console.log('🖱️  Clicking DEPLOY ASSET button...');
    await page.click('button:has-text("DEPLOY ASSET")');
    console.log('✅ Button clicked\n');

    // Wait for deployment screen
    console.log('⏳ Waiting 2 seconds for transition...');
    await page.waitForTimeout(2000);
    console.log('✅ Transition complete\n');

    // Take screenshot of deployment hub
    console.log('📸 Capturing mission deployment hub...');
    await page.screenshot({ path: 'screenshot-deployment-new.png', fullPage: true });
    console.log('✅ Saved: screenshot-deployment-new.png\n');

    // Check for key elements
    const headerText = await page.textContent('header');
    console.log('🔍 Header content:', headerText?.substring(0, 80) || 'Not found');
    
    const sidebarText = await page.textContent('aside');
    console.log('🔍 Sidebar content:', sidebarText?.substring(0, 80) || 'Not found');
    
    const footerText = await page.textContent('footer');
    console.log('🔍 Footer content:', footerText?.substring(0, 80) || 'Not found');

    console.log('\n✨ All screenshots captured successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
