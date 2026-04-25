const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.createContext();
  const page = await context.newPage();

  // Collect console logs
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.includes('[BoardRenderer]')) {
      console.log(`[CONSOLE] ${text}`);
    }
  });

  // Navigate to the game
  console.log('Opening game at http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Wait a bit for the app to load
  await page.waitForTimeout(2000);

  // Check if Phaser is loaded
  const phaserLoaded = await page.evaluate(() => window.Phaser !== undefined);
  console.log(`Phaser loaded: ${phaserLoaded}`);

  // Take initial screenshot
  await page.screenshot({ path: 'screenshot-1-initial.png' });
  console.log('Saved screenshot: screenshot-1-initial.png');

  // Find and click "FIND MATCH" button
  console.log('Looking for FIND MATCH button...');
  const findMatchBtn = await page.$('button:has-text("FIND MATCH")');
  if (findMatchBtn) {
    console.log('Found FIND MATCH button, clicking...');
    await findMatchBtn.click();
  } else {
    // Try to find it in canvas or custom element
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons`);
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`Button ${i}: "${text}"`);
      if (text && text.includes('FIND MATCH')) {
        console.log(`Clicking button ${i}`);
        await buttons[i].click();
        break;
      }
    }
  }

  // Wait for match to start (or for a timeout)
  console.log('Waiting for game state...');
  await page.waitForTimeout(5000);

  // Try to find player names in the page
  const playerNames = await page.evaluate(() => {
    const texts = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.textContent && el.textContent.length < 100) {
        texts.push(el.textContent);
      }
    });
    return texts;
  });

  console.log(`Found ${playerNames.length} text elements on page`);
  
  // Look for board renderer logs
  const boardRendererLogs = logs.filter(l => l.includes('[BoardRenderer]'));
  console.log(`\nFound ${boardRendererLogs.length} BoardRenderer console logs:`);
  boardRendererLogs.forEach(log => console.log(`  ${log}`));

  // Take game screenshot
  await page.screenshot({ path: 'screenshot-2-game.png' });
  console.log('Saved screenshot: screenshot-2-game.png');

  // Check for errors in console
  const errorLogs = logs.filter(l => l.toLowerCase().includes('error'));
  if (errorLogs.length > 0) {
    console.log(`\nFound ${errorLogs.length} errors:`);
    errorLogs.forEach(log => console.log(`  ${log}`));
  }

  // Extract opponentStartingCity from logs
  const opponentCityLog = logs.find(l => l.includes('opponentStartingCity'));
  if (opponentCityLog) {
    console.log(`\nOpponent starting city info: ${opponentCityLog}`);
  }

  await browser.close();
})();
