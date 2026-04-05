import { chromium } from 'playwright';

async function testLinkModal() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🧪 Testing LINK TO NETWORK modal...\n');
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'Phoenix');
    await page.click('button:has-text("DEPLOY ASSET")');
    await page.waitForTimeout(2000);

    // Find and click LINK TO NETWORK button (second button)
    const buttons = await page.locator('button').filter({ has: page.locator('h3') }).all();
    console.log(`Found ${buttons.length} hero buttons`);
    
    // The second button should be LINK TO NETWORK
    if (buttons.length >= 2) {
      console.log('🖱️  Clicking second button (LINK TO NETWORK)...');
      await buttons[1].click();
      console.log('✅ Button clicked\n');

      // Wait for modal
      await page.waitForTimeout(800);

      // Take screenshot
      console.log('📸 Capturing modal...');
      await page.screenshot({ path: 'screenshot-modal-open.png', fullPage: true });
      console.log('✅ Modal screenshot saved\n');

      // Check if input exists
      const input = page.locator('input[placeholder*="Room Number"]');
      const isVisible = await input.isVisible();
      console.log(`✅ Room number input visible: ${isVisible}\n`);

      if (isVisible) {
        // Type room number
        console.log('⌨️  Typing "5678"...');
        await input.fill('5678');
        console.log('✅ Room number entered\n');

        // Check if ESTABLISH LINK button is now enabled
        const establishBtn = page.locator('button:has-text("ESTABLISH LINK")');
        const isEnabled = !await establishBtn.isDisabled();
        console.log(`✅ ESTABLISH LINK enabled: ${isEnabled}\n`);

        console.log('📸 Capturing filled modal...');
        await page.screenshot({ path: 'screenshot-modal-filled.png', fullPage: true });
        console.log('✅ Filled modal screenshot saved\n');
      }
    }

    console.log('✨ Modal test completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testLinkModal();
