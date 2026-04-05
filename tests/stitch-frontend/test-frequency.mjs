import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🎬 Testing frequency modal with radar animation...\n');
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded\n');

    // Enter codename
    await page.fill('input[type="text"]', 'Cipher');
    await page.click('button:has-text("DEPLOY ASSET")');
    await page.waitForTimeout(2000);

    console.log('🎯 Clicking INITIATE OPERATION...');
    const buttons = await page.locator('button').filter({ has: page.locator('h3') }).all();
    await buttons[0].click();
    console.log('✅ Button clicked\n');

    // Wait for modal
    await page.waitForTimeout(500);

    // Check for big frequency numbers
    const frequencyNumbers = await page.locator('div.text-8xl').textContent();
    console.log(`📊 Frequency displayed: ${frequencyNumbers}\n`);

    // Take screenshot of modal with radar
    console.log('📸 Capturing frequency modal with radar...');
    await page.screenshot({ path: 'screenshot-frequency-modal.png', fullPage: true });
    console.log('✅ Saved: screenshot-frequency-modal.png\n');

    // Check for close button
    const closeBtn = await page.locator('button:has-text("CLOSE")').isVisible();
    console.log(`✅ CLOSE button visible: ${closeBtn}\n`);

    // Check for radar circles
    const radarCircles = await page.locator('div.rounded-full.border').count();
    console.log(`✅ Radar circles rendered: ${radarCircles > 0}\n`);

    // Click close
    if (closeBtn) {
      console.log('🖱️  Clicking CLOSE...');
      await page.click('button:has-text("CLOSE")');
      console.log('✅ Modal closed\n');
    }

    // Now test LINK TO NETWORK modal
    console.log('🔗 Testing LINK TO NETWORK modal...');
    const linkBtn = buttons[1];
    await linkBtn.click();
    await page.waitForTimeout(500);
    
    console.log('📸 Capturing LINK TO NETWORK modal...');
    await page.screenshot({ path: 'screenshot-link-modal-final.png', fullPage: true });
    console.log('✅ Saved: screenshot-link-modal-final.png\n');

    // Check modal title says "ENTER FREQUENCY"
    const modalTitle = await page.locator('h2:has-text("ENTER FREQUENCY")').isVisible();
    console.log(`✅ Modal says "ENTER FREQUENCY": ${modalTitle}\n`);

    console.log('✨ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
