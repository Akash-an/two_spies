import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    const title = await page.title();
    console.log('✅ Page loaded successfully!');
    console.log('Page title:', title);
    
    const heading = await page.textContent('h1');
    console.log('Page heading:', heading);
    
    await page.screenshot({ path: 'screenshot-stitch-frontend.png' });
    console.log('✅ Screenshot saved: screenshot-stitch-frontend.png');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await browser.close();
  }
})();
