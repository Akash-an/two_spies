import { test, expect } from '@playwright/test';

test.describe('Two Player Match Flow - Display Code Verification', () => {
  const BASE_URL = 'http://localhost:5174';

  test('both players should successfully join using the displayed match code', async ({ browser }) => {
    console.log('\n=== TWO PLAYER TEST: Display Code Verification ===\n');

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    try {
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Collect console logs
      const player1Logs: string[] = [];
      const player2Logs: string[] = [];

      page1.on('console', (msg) => {
        const text = msg.text();
        player1Logs.push(text);
        console.log(`[P1] ${text}`);
      });

      page2.on('console', (msg) => {
        const text = msg.text();
        player2Logs.push(text);
        console.log(`[P2] ${text}`);
      });

      // ========== PLAYER 1: Initiate Operation ==========
      console.log('\n>>> PLAYER 1: Initiating operation...');
      await page1.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page1.waitForTimeout(1000);

      // Register Player 1
      const input1 = page1.locator('input[type="text"]').first();
      await input1.waitFor({ state: 'visible', timeout: 5000 });
      console.log('  [P1] Found input, entering codename...');
      await input1.fill('PLAYER_ONE');
      await page1.waitForTimeout(300);

      // Submit codename
      const submitBtn1 = page1.locator('button:has-text("ESTABLISH")');
      if (await submitBtn1.count() > 0) {
        await submitBtn1.click();
      } else {
        await page1.keyboard.press('Enter');
      }
      await page1.waitForTimeout(1500);

      // Click INITIATE OPERATION
      console.log('  [P1] Looking for INITIATE OPERATION button...');
      const initiateBtn = page1.locator('button:has-text("INITIATE OPERATION")');
      await initiateBtn.waitFor({ state: 'visible', timeout: 5000 });
      console.log('  [P1] Clicking INITIATE OPERATION...');
      await initiateBtn.click();
      await page1.waitForTimeout(1000);

      // Wait for frequency modal and extract displayed code
      console.log('  [P1] Waiting for frequency modal...');
      const frequencyText = page1.locator('.text-8xl').first();
      await frequencyText.waitFor({ state: 'visible', timeout: 10000 });
      
      const displayedCode = await frequencyText.textContent();
      const trimmedCode = displayedCode?.trim();
      
      console.log(`\n  ✓ [P1] DISPLAYED CODE IN MODAL: ${trimmedCode}`);
      console.log(`\n>>> PLAYER 1 WAITING FOR PLAYER 2 TO JOIN...\n`);

      expect(trimmedCode).toBeTruthy();
      expect(trimmedCode).toMatch(/^\d+$/);

      // Extract backend-generated code from logs
      let backendCode: string | null = null;
      const matchCreatedLogs = player1Logs.filter((log) => log.includes('Match created'));
      console.log(`  [P1] Match created logs: ${matchCreatedLogs.length} found`);
      
      for (const log of matchCreatedLogs) {
        console.log(`    Parsing: ${log}`);
        // Try to find code in the log
        const codeMatch = log.match(/code['":\s]*['":]?(\d+)/);
        if (codeMatch) {
          backendCode = codeMatch[1];
          console.log(`    ✓ Extracted backend code: ${backendCode}`);
          break;
        }
      }

      if (backendCode) {
        console.log(`\n  [P1] Backend code from logs: ${backendCode}`);
        console.log(`  [P1] Displayed code in UI: ${trimmedCode}`);
        
        if (backendCode === trimmedCode) {
          console.log(`  ✓✓✓ CODES MATCH! ✓✓✓\n`);
        } else {
          console.log(`  ✗✗✗ CODES MISMATCH! ✗✗✗`);
          console.log(`    Backend: ${backendCode}`);
          console.log(`    Display: ${trimmedCode}\n`);
        }
      }

      // ========== PLAYER 2: Join Using Displayed Code ==========
      console.log('>>> PLAYER 2: Joining match...');
      await page2.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page2.waitForTimeout(1000);

      // Register Player 2
      const input2 = page2.locator('input[type="text"]').first();
      await input2.waitFor({ state: 'visible', timeout: 5000 });
      console.log('  [P2] Found input, entering codename...');
      await input2.fill('PLAYER_TWO');
      await page2.waitForTimeout(300);

      // Submit codename
      const submitBtn2 = page2.locator('button:has-text("ESTABLISH")');
      if (await submitBtn2.count() > 0) {
        await submitBtn2.click();
      } else {
        await page2.keyboard.press('Enter');
      }
      await page2.waitForTimeout(1500);

      // Click LINK TO NETWORK
      console.log('  [P2] Looking for LINK TO NETWORK button...');
      const linkBtn = page2.locator('button:has-text("LINK TO NETWORK")');
      await linkBtn.waitFor({ state: 'visible', timeout: 5000 });
      console.log('  [P2] Clicking LINK TO NETWORK...');
      await linkBtn.click();
      await page2.waitForTimeout(500);

      // Fill in frequency modal
      console.log(`  [P2] Entering displayed code: ${trimmedCode}`);
      const frequencyInput = page2.locator('input[type="text"]').last();
      await frequencyInput.waitFor({ state: 'visible', timeout: 5000 });
      await frequencyInput.fill(trimmedCode!);
      await page2.waitForTimeout(300);

      // Submit frequency
      const connectBtn = page2.locator('button').filter({ hasText: /CONNECT|SUBMIT|OK|JOIN/i }).first();
      if (await connectBtn.count() > 0) {
        console.log('  [P2] Clicking connect button...');
        await connectBtn.click();
      } else {
        console.log('  [P2] Pressing Enter to submit...');
        await page2.keyboard.press('Enter');
      }
      await page2.waitForTimeout(1000);

      // ========== CHECK FOR SUCCESS ==========
      console.log('\n>>> VERIFYING BOTH PLAYERS CONNECTED...\n');

      // Wait for MATCH_START on both players
      let p1_got_match_start = false;
      let p2_got_match_start = false;

      for (let i = 0; i < 50; i++) {
        if (player1Logs.some((log) => log.includes('MATCH_START') || log.includes('Match started'))) {
          p1_got_match_start = true;
        }
        if (player2Logs.some((log) => log.includes('MATCH_START') || log.includes('Match started'))) {
          p2_got_match_start = true;
        }

        if (p1_got_match_start && p2_got_match_start) {
          break;
        }

        await page1.waitForTimeout(100);
        await page2.waitForTimeout(100);
      }

      console.log(`  [P1] Received MATCH_START: ${p1_got_match_start ? '✓' : '✗'}`);
      console.log(`  [P2] Received MATCH_START: ${p2_got_match_start ? '✓' : '✗'}`);

      // Check for success messages
      let p1_in_game = false;
      let p2_in_game = false;

      // Check for Phaser game container
      const p1GameContainer = await page1.locator('.phaser-game-container').count();
      const p2GameContainer = await page2.locator('.phaser-game-container').count();

      console.log(`  [P1] Phaser game visible: ${p1GameContainer > 0 ? '✓' : '✗'}`);
      console.log(`  [P2] Phaser game visible: ${p2GameContainer > 0 ? '✓' : '✗'}`);

      p1_in_game = p1GameContainer > 0;
      p2_in_game = p2GameContainer > 0;

      // Check for game text
      const p1GameText = await page1.locator('text=/OPERATIVE|MATCH/').count();
      const p2GameText = await page2.locator('text=/OPERATIVE|MATCH/').count();

      console.log(`  [P1] Game elements found: ${p1GameText}`);
      console.log(`  [P2] Game elements found: ${p2GameText}`);

      // ========== FINAL REPORT ==========
      console.log('\n=== TEST RESULTS ===');
      console.log(`Display Code Matches Backend Code: ${backendCode === trimmedCode ? '✓ YES' : '✗ NO (BUG!)'}`);
      console.log(`Player 1 in game: ${p1_in_game ? '✓ YES' : '✗ NO'}`);
      console.log(`Player 2 in game: ${p2_in_game ? '✓ YES' : '✗ NO'}`);
      console.log(`Both got MATCH_START: ${p1_got_match_start && p2_got_match_start ? '✓ YES' : '✗ NO'}`);

      console.log('\n=== RELEVANT LOGS ===');
      console.log('\n[Player 1 - Last 10 relevant logs]');
      player1Logs
        .filter((log) => log.includes('[App]') || log.includes('[WS]') || log.includes('MATCH') || log.includes('code'))
        .slice(-10)
        .forEach((log) => console.log(`  ${log}`));

      console.log('\n[Player 2 - Last 10 relevant logs]');
      player2Logs
        .filter((log) => log.includes('[App]') || log.includes('[WS]') || log.includes('MATCH') || log.includes('code'))
        .slice(-10)
        .forEach((log) => console.log(`  ${log}`));

      // Final assertions
      if (backendCode !== trimmedCode) {
        console.log('\n⚠️  CODE MISMATCH DETECTED:');
        console.log(`   Backend generated: ${backendCode}`);
        console.log(`   Frontend displayed: ${trimmedCode}`);
        console.log('   This means the fix is incomplete!\n');
      }

      expect(backendCode).toBeDefined();
      expect(trimmedCode).toBeDefined();
      
      // This is the critical verification
      if (backendCode) {
        expect(trimmedCode).toBe(backendCode);
      }

      expect(p1_got_match_start).toBe(true);
      expect(p2_got_match_start).toBe(true);
      expect(p1_in_game).toBe(true);
      expect(p2_in_game).toBe(true);

      console.log('\n✅ ALL TESTS PASSED!\n');

    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
