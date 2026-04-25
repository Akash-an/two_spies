import { chromium } from 'playwright';

async function debugLayout() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.setViewportSize({ width: 1920, height: 1080 });
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
    
    // Check the wrapper div
    const wrapperInfo = await page.evaluate(() => {
      // Find the fixed wrapper (entering-name phase div)
      const app = document.getElementById('phaser-container')?.parentElement;
      if (!app) return { error: 'Could not find App div' };
      
      let fixedWrapper = null;
      for (const child of app.children) {
        if (child !== app.firstChild && getComputedStyle(child).position === 'fixed') {
          fixedWrapper = child;
          break;
        }
      }
      
      if (!fixedWrapper) return { error: 'Could not find fixed wrapper' };
      
      const wrapper = getComputedStyle(fixedWrapper);
      const terminal = fixedWrapper.querySelector('[data-testid="terminal-container"]');
      
      return {
        appDimensions: { 
          width: app.offsetWidth, 
          height: app.offsetHeight 
        },
        wrapperStyle: {
          position: wrapper.position,
          top: wrapper.top,
          left: wrapper.left,
          width: wrapper.width,
          height: wrapper.height,
          zIndex: wrapper.zIndex,
        },
        wrapperBox: {
          offsetWidth: fixedWrapper.offsetWidth,
          offsetHeight: fixedWrapper.offsetHeight,
          clientWidth: fixedWrapper.clientWidth,
          clientHeight: fixedWrapper.clientHeight,
        },
        terminalBox: terminal ? {
          offsetWidth: terminal.offsetWidth,
          offsetHeight: terminal.offsetHeight,
          clientWidth: terminal.clientWidth,
          clientHeight: terminal.clientHeight,
        } : null,
        viewportInfo: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          documentWidth: document.documentElement.clientWidth,
          documentHeight: document.documentElement.clientHeight,
        }
      };
    });
    
    console.log('=== Layout Debug Info ===');
    console.log(JSON.stringify(wrapperInfo, null, 2));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  await browser.close();
}

debugLayout();
