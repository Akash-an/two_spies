import { test, expect } from '@playwright/test';

test.describe('Disconnection Notifications', () => {
  const BASE_URL = 'http://localhost:5173';

  test('should show disconnection overlay when opponent leaves and hide it when they return', async ({ browser }) => {
    // Create two browser contexts (separate players)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    try {
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Logs collection
      const logs1: string[] = [];
      page1.on('console', msg => logs1.push(msg.text()));

      // ========== SETUP: Player 1 (Alpha) ==========
      await page1.goto(BASE_URL);
      await page1.locator('input[type="text"]').fill('Alpha');
      await page1.locator('button:has-text("AUTHORIZE")').click();
      await page1.locator('button:has-text("INITIATE OPERATION")').waitFor({ state: 'visible' });
      await page1.locator('button:has-text("INITIATE OPERATION")').click();

      // Get match code from logs (or UI if available)
      let matchCode: string | null = null;
      for (let i = 0; i < 50; i++) {
        const log = logs1.find(l => l.includes('FREQUENCY GENERATED:'));
        if (log) {
          matchCode = log.match(/FREQUENCY GENERATED: (\d+)/)?.[1] || null;
          if (matchCode) break;
        }
        await page1.waitForTimeout(100);
      }
      expect(matchCode).toBeTruthy();

      // ========== SETUP: Player 2 (Beta) ==========
      await page2.goto(BASE_URL);
      await page2.locator('input[type="text"]').fill('Beta');
      await page2.locator('button:has-text("AUTHORIZE")').click();
      await page2.locator('button:has-text("LINK TO NETWORK")').waitFor({ state: 'visible' });
      await page2.locator('button:has-text("LINK TO NETWORK")').click();
      await page2.locator('input[type="text"]').last().fill(matchCode!);
      await page2.keyboard.press('Enter');

      // Wait for game to start for both
      await page1.locator('.phaser-game-container').waitFor({ state: 'visible', timeout: 10000 });
      await page2.locator('.phaser-game-container').waitFor({ state: 'visible', timeout: 10000 });
      console.log('Match started for both players.');

      // ========== STEP 1: Disconnect Player 2 (Beta) ==========
      console.log('Disconnecting Player 2...');
      await page2.close();
      
      // Verify Player 1 sees the disconnection overlay
      const overlay = page1.locator('.disconnection-overlay');
      await expect(overlay).toBeVisible({ timeout: 10000 });
      await expect(overlay).toContainText('OPPONENT DISCONNECTED');
      console.log('Disconnection overlay visible for Player 1.');

      // ========== STEP 2: Reconnect Player 2 (Beta) ==========
      console.log('Reconnecting Player 2...');
      const page3 = await context2.newPage();
      await page3.goto(BASE_URL);
      
      // Should auto-authorize and jump to game because of localStorage
      await page3.locator('.phaser-game-container').waitFor({ state: 'visible', timeout: 10000 });
      console.log('Player 2 reconnected and game resumed.');

      // Verify Player 1 overlay is gone
      await expect(overlay).not.toBeVisible({ timeout: 10000 });
      console.log('Disconnection overlay hidden for Player 1.');

    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
