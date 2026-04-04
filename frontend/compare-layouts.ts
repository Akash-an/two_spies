import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function compareLayouts() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    // Take screenshot of original HTML
    const htmlPage = await context.newPage();
    await htmlPage.goto('file:///Users/akashan/projects/side_quest/two_spies/frontend/src/components/stitch-html/codename-authorization-terminal.html');
    await htmlPage.waitForLoadState('networkidle');
    await htmlPage.screenshot({ path: '/tmp/html-original.png', fullPage: true });
    
    console.log('✓ HTML screenshot saved to /tmp/html-original.png');
    
    // Get HTML viewport metrics
    const htmlMetrics = await htmlPage.evaluate(() => {
      const body = document.body;
      const main = document.querySelector('main');
      return {
        bodyHeight: body.scrollHeight,
        bodyWidth: body.offsetWidth,
        mainHeight: main?.scrollHeight,
        mainOffset: main?.offsetTop,
        headerHeight: document.querySelector('header')?.offsetHeight,
        footerHeight: document.querySelector('[role="navigation"]')?.offsetHeight || 
                     document.querySelectorAll('div')[document.querySelectorAll('div').length - 1]?.offsetHeight
      };
    });
    console.log('HTML Metrics:', htmlMetrics);
    
    await htmlPage.close();

    // Take screenshot of React app
    const reactPage = await context.newPage();
    await reactPage.goto('http://localhost:5173');
    await reactPage.waitForSelector('[data-testid="terminal-container"]', { timeout: 10000 });
    await reactPage.waitForLoadState('networkidle');
    await reactPage.screenshot({ path: '/tmp/react-app.png', fullPage: true });
    
    console.log('✓ React app screenshot saved to /tmp/react-app.png');
    
    // Get React viewport metrics
    const reactMetrics = await reactPage.evaluate(() => {
      const container = document.querySelector('[data-testid="terminal-container"]');
      const main = document.querySelector('[data-testid="terminal-main"]');
      return {
        containerHeight: container?.scrollHeight,
        containerWidth: container?.offsetWidth,
        mainHeight: main?.scrollHeight,
        mainOffset: main?.offsetTop,
        headerHeight: document.querySelector('[data-testid="terminal-header"]')?.offsetHeight,
        actionBarHeight: document.querySelector('[data-testid="action-bar"]')?.offsetHeight
      };
    });
    console.log('React Metrics:', reactMetrics);
    
    await reactPage.close();

    console.log('\n=== COMPARISON ===');
    console.log('HTML body height:', htmlMetrics.bodyHeight);
    console.log('React container height:', reactMetrics.containerHeight);
    console.log('\nHTML fills entire viewport: ', htmlMetrics.bodyHeight >= 1080);
    console.log('React fills entire viewport: ', reactMetrics.containerHeight >= 1080);

  } finally {
    await browser.close();
  }
}

compareLayouts().catch(console.error);
