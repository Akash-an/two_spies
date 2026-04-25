/**
 * Comprehensive Test: Two-Player Match Flow with Code Verification
 * 
 * This test verifies:
 * 1. Backend generates a match code
 * 2. Frontend displays the correct code to Player 1
 * 3. Player 2 can join using that displayed code
 * 4. Both players sync and enter the game
 */

import { test, expect } from '@playwright/test';

test('two-player match code flow: create match, display code, join, game', async ({ browser }) => {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     TWO-PLAYER MATCH CODE VERIFICATION TEST               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();

    try {
      const p1 = await ctx1.newPage();
      const p2 = await ctx2.newPage();

      const p1Logs: string[] = [];
      const p2Logs: string[] = [];

      // Intercept console logs
      p1.on('console', (msg) => {
        p1Logs.push(msg.text());
        if (msg.text().includes('[App]') || msg.text().includes('[Mission') || msg.text().includes('Match')) {
          console.log(`  [P1] ${msg.text()}`);
        }
      });

      p2.on('console', (msg) => {
        p2Logs.push(msg.text());
        if (msg.text().includes('[App]') || msg.text().includes('[Mission') || msg.text().includes('Match')) {
          console.log(`  [P2] ${msg.text()}`);
        }
      });

      // ════════════════════════════════════════════════════════════
      // PLAYER 1: SETUP
      // ════════════════════════════════════════════════════════════
      console.log('Step 1: Player 1 - Registration\n');
      await p1.goto('http://localhost:5174', { waitUntil: 'networkidle' });
      await p1.waitForTimeout(1000);

      // Enter codename
      const input1 = p1.locator('input[type="text"]').first();
      await input1.waitFor({ state: 'visible', timeout: 5000 });
      await input1.fill('PLAYER_ONE');
      console.log('  ✓ Entered codename: PLAYER_ONE');

      // Submit
      let submitBtn = p1.locator('button:has-text("ESTABLISH")');
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
      } else {
        await p1.keyboard.press('Enter');
      }
      await p1.waitForTimeout(1500);
      console.log('  ✓ Established connection\n');

      // ════════════════════════════════════════════════════════════
      // PLAYER 1: INITIATE OPERATION
      // ════════════════════════════════════════════════════════════
      console.log('Step 2: Player 1 - Initiate Operation\n');
      
      const initiateBtn = p1.locator('button:has-text("INITIATE OPERATION")');
      await initiateBtn.waitFor({ state: 'visible', timeout: 5000 });
      console.log('  ✓ Found INITIATE OPERATION button');

      await initiateBtn.click();
      console.log('  ✓ Clicked button, waiting for modal...');
      await p1.waitForTimeout(1500);

      // ════════════════════════════════════════════════════════════
      // EXTRACT: Displayed Code from UI
      // ════════════════════════════════════════════════════════════
      console.log('Step 3: Extract Displayed Code\n');

      const titleText = p1.locator('text=SECURE FREQUENCY');
      await titleText.waitFor({ state: 'visible', timeout: 5000 });
      console.log('  ✓ Modal visible with SECURE FREQUENCY');

      // Find the large number element
      const frequencyElements = await p1.locator('.text-8xl').all();
      let displayedCode: string | null = null;

      for (const elem of frequencyElements) {
        const content = await elem.textContent();
        if (content && /^\d+$/.test(content.trim())) {
          displayedCode = content.trim();
          break;
        }
      }

      if (!displayedCode) {
        // Try alternative selector
        const altFreq = await p1.locator('text=/^[0-9]{4}$/').first().textContent();
        displayedCode = altFreq?.trim() || null;
      }

      console.log(`  ✓ Displayed code extracted: ${displayedCode}\n`);
      expect(displayedCode).toBeTruthy();
      expect(displayedCode).toMatch(/^\d+$/);

      // ════════════════════════════════════════════════════════════
      // EXTRACT: Backend Code from Console Logs
      // ════════════════════════════════════════════════════════════
      console.log('Step 4: Extract Backend-Generated Code\n');

      let backendCode: string | null = null;
      const matchCreatedLogs = p1Logs.filter((log) => log.includes('Match created'));

      console.log(`  Found ${matchCreatedLogs.length} relevant log entries`);

      for (const logLine of matchCreatedLogs) {
        // Parse code from log like: [App] Match created: {payload: {code: '2344'}, ...}
        const codeMatches = logLine.match(/code['":\s]*['":]?(\d+)/gi);
        
        if (codeMatches) {
          for (const match of codeMatches) {
            const num = match.match(/\d+/);
            if (num) {
              backendCode = num[0];
              break;
            }
          }
        }

        if (backendCode) break;
      }

      if (backendCode) {
        console.log(`  ✓ Backend code extracted: ${backendCode}\n`);
      } else {
        console.log('  ⚠ Could not extract backend code from logs\n');
      }

      // ════════════════════════════════════════════════════════════
      // COMPARISON
      // ════════════════════════════════════════════════════════════
      console.log('Step 5: Compare Codes\n');
      console.log(`  Displayed Code: ${displayedCode}`);
      console.log(`  Backend Code:   ${backendCode || 'NOT FOUND'}\n`);

      if (backendCode) {
        if (displayedCode === backendCode) {
          console.log('  ✅ CODES MATCH!\n');
        } else {
          console.log('  ❌ CODES DO NOT MATCH!\n');
        }
      }

      // ════════════════════════════════════════════════════════════
      // PLAYER 2: JOIN
      // ════════════════════════════════════════════════════════════
      console.log('Step 6: Player 2 - Join Match\n');
      await p2.goto('http://localhost:5174', { waitUntil: 'networkidle' });
      await p2.waitForTimeout(1000);

      // Register
      const input2 = p2.locator('input[type="text"]').first();
      await input2.waitFor({ state: 'visible', timeout: 5000 });
      await input2.fill('PLAYER_TWO');
      console.log('  ✓ Entered codename: PLAYER_TWO');

      submitBtn = p2.locator('button:has-text("ESTABLISH")');
      if (await submitBtn.count() > 0) {
        await submitBtn.click();
      } else {
        await p2.keyboard.press('Enter');
      }
      await p2.waitForTimeout(1500);
      console.log('  ✓ Established connection');

      // Click LINK TO NETWORK
      const linkBtn = p2.locator('button:has-text("LINK TO NETWORK")');
      await linkBtn.waitFor({ state: 'visible', timeout: 5000 });
      await linkBtn.click();
      console.log('  ✓ Clicked LINK TO NETWORK');
      await p2.waitForTimeout(500);

      // Enter frequency code using displayed code
      console.log(`  ✓ Entering code: ${displayedCode}`);
      const freqInput = p2.locator('input[type="text"]').last();
      await freqInput.waitFor({ state: 'visible', timeout: 5000 });
      await freqInput.fill(displayedCode!);
      await p2.waitForTimeout(300);

      // Submit
      const connectBtn = p2.locator('button').filter({ hasText: /CONNECT|SUBMIT|OK|JOIN/i }).first();
      if (await connectBtn.count() > 0) {
        await connectBtn.click();
      } else {
        await p2.keyboard.press('Enter');
      }
      console.log('  ✓ Submitted frequency code\n');
      await p2.waitForTimeout(1500);

      // ════════════════════════════════════════════════════════════
      // VERIFY: Both Players Connected
      // ════════════════════════════════════════════════════════════
      console.log('Step 7: Verify Connection\n');

      let p1_got_start = false;
      let p2_got_start = false;

      for (let i = 0; i < 50; i++) {
        if (p1Logs.some((l) => l.includes('MATCH_START'))) p1_got_start = true;
        if (p2Logs.some((l) => l.includes('MATCH_START'))) p2_got_start = true;

        if (p1_got_start && p2_got_start) break;
        await p1.waitForTimeout(100);
        await p2.waitForTimeout(100);
      }

      const p1PhraserActive = (await p1.locator('.phaser-game-container').count()) > 0;
      const p2PhaserActive = (await p2.locator('.phaser-game-container').count()) > 0;

      console.log(`  [P1] Match started: ${p1_got_start ? '✓' : '✗'}`);
      console.log(`  [P2] Match started: ${p2_got_start ? '✓' : '✗'}`);
      console.log(`  [P1] In Phaser game: ${p1PhraserActive ? '✓' : '✗'}`);
      console.log(`  [P2] In Phaser game: ${p2PhaserActive ? '✓' : '✗'}\n`);

      // ════════════════════════════════════════════════════════════
      // FINAL RESULTS
      // ════════════════════════════════════════════════════════════
      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    TEST RESULTS                             ║');
      console.log('╠════════════════════════════════════════════════════════════╣');
      console.log(`║ Display Code == Backend Code: ${backendCode === displayedCode ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`║ Both players got MATCH_START:  ${p1_got_start && p2_got_start ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`║ Both players in game:          ${p1PhraserActive && p2PhaserActive ? '✅ PASS' : '❌ FAIL'}`);
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      // Assertions
      expect(displayedCode).toBeTruthy();
      if (backendCode) {
        expect(displayedCode).toBe(backendCode);
      }
      expect(p1_got_start).toBe(true);
      expect(p2_got_start).toBe(true);
      expect(p1PhraserActive).toBe(true);
      expect(p2PhaserActive).toBe(true);

    } finally {
      await ctx1.close();
      await ctx2.close();
    }
});
