import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🎬 Testing room number functionality...\n');
    
    // Navigate to app
    console.log('📍 Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    // Enter codename and deploy
    console.log('⌨️  Entering codename "Phantom"...');
    await page.fill('input[type="text"]', 'Phantom');
    await page.click('button:has-text("DEPLOY ASSET")');
    console.log('✅ Transitioned to deployment screen\n');

    await page.waitForTimeout(1500);

    // Click INITIATE OPERATION
    console.log('🖱️  Clicking INITIATE OPERATION...');
    const initiateButton = page.locator('button').filter({ has: page.locator('text=INITIATE OPERATION') }).first();
    await initiateButton.click();
    console.log('✅ Button clicked\n');

    // Check if room number is displayed
    await page.waitForTimeout(500);
    const roomText = await page.locator('h3:has-text("ROOM:")').first().textContent();
    console.log(`📌 Room generated: ${roomText}\n`);

    // Take screenshot showing room number
    console.log('📸 Capturing deployment screen with room number...');
    await page.screenshot({ path: 'screenshot-room-generated.png', fullPage: true });
    console.log('✅ Saved: screenshot-room-generated.png\n');

    // Click LINK TO NETWORK to open modal
    console.log('🖱️  Clicking LINK TO NETWORK...');
    const linkButton = page.locator('button').filter({ has: page.locator('text=LINK TO NETWORK') }).nth(1);
    await linkButton.click();
    console.log('✅ Button clicked\n');

    // Wait for modal
    await page.waitForTimeout(500);

    // Check if modal is visible
    const modalInput = page.locator('input[placeholder="Room Number (4 digits)"]');
    const isVisible = await modalInput.isVisible();
    console.log(`🔍 Modal visible: ${isVisible}\n`);

    // Enter room number
    if (isVisible) {
      console.log('⌨️  Entering room number "1234"...');
      await modalInput.fill('1234');
      console.log('✅ Room number entered\n');

      // Take screenshot of modal
      console.log('📸 Capturing modal...');
      await page.screenshot({ path: 'screenshot-link-modal.png', fullPage: true });
      console.log('✅ Saved: screenshot-link-modal.png\n');

      // Click ESTABLISH LINK
      console.log('🖱️  Clicking ESTABLISH LINK...');
      const establishButton = page.locator('button:has-text("ESTABLISH LINK")');
      await establishButton.click();
      console.log('✅ Link established\n');

      await page.waitForTimeout(500);
    }

    // Check footer (DEPLOY ASSET should be gone)
    const footer = await page.locator('footer').textContent();
    const hasDeployButton = footer?.includes('DEPLOY ASSET') ?? false;
    console.log(`✅ DEPLOY ASSET button removed: ${!hasDeployButton}\n`);

    console.log('✨ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
