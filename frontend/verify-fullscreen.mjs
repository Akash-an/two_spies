import { chromium } from 'playwright';

async function verify() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });
  
  try {
    console.log('Navigation to dev server...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    console.log('Waiting for terminal container...');
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
    
    const bbox = await page.locator('[data-testid="terminal-container"]').boundingBox();
    console.log('✓ Terminal Container Bounding Box:', bbox);
    
    if (bbox && bbox.width === 1920 && bbox.height === 1080) {
      console.log('✅ Terminal is fullscreen! (1920x1080)');
    } else {
      console.log('⚠️  Terminal dimensions:', bbox?.width, 'x', bbox?.height);
    }
    
    // Check header and main positioning
    const headerBbox = await page.locator('[data-testid="terminal-header"]').boundingBox();
    const mainBbox = await page.locator('[data-testid="terminal-main"]').boundingBox();
    
    console.log('✓ Header Box:', headerBbox);
    console.log('✓ Main Content Box:', mainBbox);
    
    // Test for visual elements
    const titleText = await page.locator('[data-testid="terminal-title"]').textContent();
    const headerText = await page.locator('[data-testid="mission-name"]').textContent();
    
    console.log('✓ Title:', titleText?.trim());
    console.log('✓ Header:', headerText?.trim());
    
    // Screenshot
    await page.screenshot({ path: '/tmp/react-terminal-fixed.png' });
    console.log('\n✓ Screenshot saved to /tmp/react-terminal-fixed.png');
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
}

verify();
