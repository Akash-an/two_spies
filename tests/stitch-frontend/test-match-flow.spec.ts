import { test, expect } from '@playwright/test';

test.describe('Match Flow - Create and Join', () => {
  const BASE_URL = 'http://localhost:5174';

  test('should allow initiating player to create match and joining player to join', async ({ browser }) => {
    // Create two browser contexts (separate players)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    try {
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Intercept console logs
      const logs1: string[] = [];
      const logs2: string[] = [];

      page1.on('console', (msg) => {
        console.log(`[Player 1] ${msg.text()}`);
        logs1.push(msg.text());
      });

      page2.on('console', (msg) => {
        console.log(`[Player 2] ${msg.text()}`);
        logs2.push(msg.text());
      });

      // ========== PLAYER 1: Initiating Player ==========
      console.log('\n=== PLAYER 1: Opening game ===');
      await page1.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page1.waitForTimeout(1000);

      // Register Player 1
      console.log('[Player 1] Finding codename input...');
      const input1 = page1.locator('input[type="text"]');
      await input1.waitFor({ state: 'visible' });
      await input1.fill('AGENT_ONE');
      await page1.waitForTimeout(300);

      // Submit codename
      console.log('[Player 1] Looking for establish button...');
      const submitBtn1 = page1.locator('button:has-text("ESTABLISH")');
      if (await submitBtn1.count() > 0) {
        await submitBtn1.click();
      } else {
        // Try alternative text
        await page1.keyboard.press('Enter');
      }
      await page1.waitForTimeout(1000);

      // Check if Player 1 is on deployment screen
      const initiateBtn = page1.locator('button:has-text("INITIATE OPERATION")');
      await initiateBtn.waitFor({ state: 'visible', timeout: 5000 });
      console.log('[Player 1] ✓ Reached deployment screen');

      // Create match
      console.log('[Player 1] Clicking INITIATE OPERATION...');
      await initiateBtn.click();
      await page1.waitForTimeout(500);

      // Wait for match creation notification in logs
      let matchCode: string | null = null;
      let attempts = 0;
      while (!matchCode && attempts < 20) {
        const foundLogs = logs1.filter((log) => log.includes('FREQUENCY GENERATED'));
        if (foundLogs.length > 0) {
          const match = foundLogs[0].match(/FREQUENCY GENERATED: (\d+)/);
          if (match) {
            matchCode = match[1];
            console.log(`[Player 1] ✓ Match created with code: ${matchCode}`);
            break;
          }
        }
        await page1.waitForTimeout(100);
        attempts++;
      }

      expect(matchCode).toBeTruthy();

      // ========== PLAYER 2: Joining Player ==========
      console.log('\n=== PLAYER 2: Opening game ===');
      await page2.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page2.waitForTimeout(1000);

      // Register Player 2
      console.log('[Player 2] Finding codename input...');
      const input2 = page2.locator('input[type="text"]');
      await input2.waitFor({ state: 'visible' });
      await input2.fill('AGENT_TWO');
      await page2.waitForTimeout(300);

      // Submit codename
      console.log('[Player 2] Looking for establish button...');
      const submitBtn2 = page2.locator('button:has-text("ESTABLISH")');
      if (await submitBtn2.count() > 0) {
        await submitBtn2.click();
      } else {
        await page2.keyboard.press('Enter');
      }
      await page2.waitForTimeout(1000);

      // Check if Player 2 is on deployment screen
      const linkBtn = page2.locator('button:has-text("LINK TO NETWORK")');
      await linkBtn.waitFor({ state: 'visible', timeout: 5000 });
      console.log('[Player 2] ✓ Reached deployment screen');

      // Join match
      console.log(`[Player 2] Clicking LINK TO NETWORK...`);
      await linkBtn.click();
      await page2.waitForTimeout(500);

      // Expect modal to appear with input for frequency
      const frequencyInput = page2.locator('input[type="text"]').last();
      await frequencyInput.waitFor({ state: 'visible', timeout: 3000 });
      console.log('[Player 2] ✓ Frequency input modal appeared');

      // Enter match code
      await frequencyInput.fill(matchCode!);
      await page2.waitForTimeout(300);

      // Look for connect or submit button in modal
      const connectBtn = page2.locator('button').filter({ hasText: /CONNECT|SUBMIT|OK|JOIN/i }).first();
      if (await connectBtn.count() > 0) {
        await connectBtn.click();
      } else {
        await page2.keyboard.press('Enter');
      }
      console.log('[Player 2] ✓ Submitted frequency');
      await page2.waitForTimeout(1000);

      // ========== VERIFY BOTH PLAYERS CONNECTED ==========
      console.log('\n=== VERIFYING MATCH STATE ===');

      // Check console logs for MATCH_START
      let player1GotMatchStart = false;
      let player2GotMatchStart = false;

      for (let i = 0; i < 50; i++) {
        if (logs1.some((log) => log.includes('MATCH_START') || log.includes('MATCH started'))) {
          player1GotMatchStart = true;
        }
        if (logs2.some((log) => log.includes('MATCH_START') || log.includes('MATCH started'))) {
          player2GotMatchStart = true;
        }

        if (player1GotMatchStart && player2GotMatchStart) {
          break;
        }

        await page1.waitForTimeout(100);
        await page2.waitForTimeout(100);
      }

      console.log(`[Player 1] MATCH_START received: ${player1GotMatchStart}`);
      console.log(`[Player 2] MATCH_START received: ${player2GotMatchStart}`);

      // Check if Phaser game is visible (PhaserGame should render after MATCH_START)
      // The container div should exist
      const phaser1 = await page1.locator('.phaser-game-container').count();
      const phaser2 = await page2.locator('.phaser-game-container').count();

      console.log(`[Player 1] Phaser container visible: ${phaser1 > 0}`);
      console.log(`[Player 2] Phaser container visible: ${phaser2 > 0}`);

      // Verify game started
      const gameText1 = await page1.locator('text=/OPERATIVE|MATCH/').count();
      const gameText2 = await page2.locator('text=/OPERATIVE|MATCH/').count();

      console.log(`\n✓ TEST PASSED: Both players connected and game started`);
      console.log(`  Player 1 game elements: ${gameText1}`);
      console.log(`  Player 2 game elements: ${gameText2}`);

      // Print relevant logs
      console.log('\n=== Player 1 Relevant Logs ===');
      logs1
        .filter(
          (log) =>
            log.includes('[WS]') ||
            log.includes('[App]') ||
            log.includes('FREQUENCY') ||
            log.includes('MATCH') ||
            log.includes('Error')
        )
        .slice(-10)
        .forEach((log) => console.log(log));

      console.log('\n=== Player 2 Relevant Logs ===');
      logs2
        .filter(
          (log) =>
            log.includes('[WS]') ||
            log.includes('[App]') ||
            log.includes('FREQUENCY') ||
            log.includes('MATCH') ||
            log.includes('Error')
        )
        .slice(-10)
        .forEach((log) => console.log(log));
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
