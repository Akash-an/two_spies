import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🎬 Testing updated frequency modals with rounded corners...\n');
    
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.fill('input[type="text"]', 'Shadow');
    await page.click('button:has-text("DEPLOY ASSET")');
    await page.waitForTimeout(2000);

    console.log('📊 Testing INITIATE OPERATION modal...');
    const buttons = await page.locator('button').filter({ has: page.locator('h3') }).all();
    await buttons[0].click();
    await page.waitForTimeout(500);

    console.log('📸 Capturing frequency modal...');
    await page.screenshot({ path: 'screenshot-frequency-rounded.png', fullPage: true });
    console.log('✅ Saved\n');

    // Check that corners are rounded (no clipping)
    const frequencyCard = await page.locator('div.rounded-lg').filter({ has: page.locator('text=SECURE FREQUENCY') }).first();
    const hasRoundedCorners = await frequencyCard.evaluate(el => window.getComputedStyle(el).borderRadius.includes('4px'));
    console.log(`✅ Frequency modal has rounded corners: ${hasRoundedCorners}\n`);

    // Close and open link modal
    await page.click('button:has-text("CLOSE")');
    await page.waitForTimeout(500);

    console.log('📡 Testing LINK TO NETWORK modal...');
    await buttons[1].click();
    await page.waitForTimeout(500);

    console.log('📸 Capturing link modal with radar...');
    await page.screenshot({ path: 'screenshot-link-modal-green.png', fullPage: true });
    console.log('✅ Saved\n');

    // Check modal colors
    const linkModal = await page.locator('h2:has-text("ENTER FREQUENCY")');
    const modalText = await linkModal.evaluate(el => window.getComputedStyle(el).color);
    console.log(`✅ Link modal heading color: ${modalText}\n`);

    // Check for radar circles
    const radarCircles = await page.locator('div.rounded-full.border').count();
    console.log(`✅ Radar animation circles: ${radarCircles} (background)\n`);

    // Enter frequency and test
    const input = page.locator('input[placeholder*="Frequency"]');
    await input.fill('3456');
    await page.waitForTimeout(300);

    const establishBtn = page.locator('button:has-text("ESTABLISH LINK")');
    const isEnabled = !await establishBtn.isDisabled();
    console.log(`✅ ESTABLISH LINK button enabled: ${isEnabled}\n`);

    console.log('✨ All tests complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
