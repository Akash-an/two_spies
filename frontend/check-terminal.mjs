import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
    
    const bbox = await page.locator('[data-testid="terminal-container"]').boundingBox();
    console.log('✓ Terminal Container Bounding Box:', bbox);
    
    const headerBbox = await page.locator('[data-testid="terminal-header"]').boundingBox();
    console.log('✓ Header Bounding Box:', headerBbox);
    
    const mainBbox = await page.locator('[data-testid="terminal-main"]').boundingBox();
    console.log('✓ Main Content Bounding Box:', mainBbox);
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
}

check();
