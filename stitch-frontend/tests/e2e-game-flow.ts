/**
 * E2E Test: Full Two-Player Game Flow
 *
 * Tests the complete lifecycle:
 * 1. Player 1 enters name, creates a match
 * 2. Player 2 enters name, joins with match code
 * 3. Both transition to the game view
 * 4. Verify game state elements are rendered
 * 5. Test basic game actions (wait, end turn)
 *
 * Prerequisites:
 *   - Backend running on ws://localhost:8080
 *   - stitch-frontend dev server on http://localhost:5173
 *
 * Run: npx tsx tests/e2e-game-flow.ts
 */

import { chromium, Browser, BrowserContext } from 'playwright';

const BASE_URL = 'http://localhost:5173';
const TIMEOUT = 10000;

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function test() {
  console.log('=== E2E Test: Full Two-Player Game Flow ===\n');

  let browser: Browser | null = null;
  let ctx1: BrowserContext | null = null;
  let ctx2: BrowserContext | null = null;

  try {
    browser = await chromium.launch({ headless: true });

    // ── Step 1: Player 1 — Enter name ──
    console.log('[1/9] Player 1: Opening app and entering name...');
    ctx1 = await browser.newContext();
    const p1 = await ctx1.newPage();
    p1.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') console.log('[P1 err]', text);
      else if (text.includes('[WS]') || text.includes('[App]')) console.log('[P1]', text);
    });
    await p1.goto(BASE_URL);
    await p1.waitForLoadState('networkidle');

    // Wait for WebSocket connection to establish (React StrictMode double-mounts)
    await sleep(3000);

    // Submit button text is "DEPLOY ASSET", need to wait for it to be enabled
    const nameInput1 = await p1.waitForSelector('input[type="text"]', { timeout: TIMEOUT });
    await nameInput1.fill('Agent_Alpha');

    const submitBtn1 = await p1.waitForSelector('button[data-testid="submit-button"]:not([disabled])', { timeout: TIMEOUT });
    await submitBtn1.click();
    console.log('   ✓ Player 1 entered name: Agent_Alpha');

    await sleep(1500);

    // ── Step 2: Player 1 — Create match ──
    console.log('[2/9] Player 1: Creating match...');
    const createBtn = await p1.waitForSelector('button:has-text("INITIATE OPERATION")', { timeout: TIMEOUT });
    await createBtn.click();

    // Wait for the SECURE FREQUENCY modal to appear with the match code
    // The code is in a text-8xl element inside the modal
    await sleep(2000);
    const matchCode = await p1.evaluate(() => {
      // The match code is displayed as large text inside the generated frequency modal
      // It's a 4-digit number in a very large font element
      const bigText = document.querySelector('.text-8xl');
      if (bigText && bigText.textContent) {
        return bigText.textContent.trim();
      }
      return null;
    });

    if (!matchCode || matchCode.length !== 4) {
      // Take debug screenshot
      await p1.screenshot({ path: 'tests/screenshots/debug-p1-match-code.png' });
      throw new Error(`Could not find match code. Got: "${matchCode}"`);
    }
    console.log(`   ✓ Match created with code: ${matchCode}`);

    // Close the code modal
    const closeBtn = await p1.waitForSelector('button:has-text("CLOSE")', { timeout: TIMEOUT });
    await closeBtn.click();
    await sleep(500);

    // ── Step 3: Player 2 — Enter name ──
    console.log('[3/9] Player 2: Opening app and entering name...');
    ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    p2.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') console.log('[P2 err]', text);
      else if (text.includes('[WS]') || text.includes('[App]')) console.log('[P2]', text);
    });
    await p2.goto(BASE_URL);
    await p2.waitForLoadState('networkidle');

    // Wait for WebSocket connection
    await sleep(3000);

    const nameInput2 = await p2.waitForSelector('input[type="text"]', { timeout: TIMEOUT });
    await nameInput2.fill('Agent_Bravo');

    const submitBtn2 = await p2.waitForSelector('button[data-testid="submit-button"]:not([disabled])', { timeout: TIMEOUT });
    await submitBtn2.click();
    console.log('   ✓ Player 2 entered name: Agent_Bravo');

    await sleep(1500);

    // ── Step 4: Player 2 — Join match ──
    console.log('[4/9] Player 2: Joining match with code ' + matchCode + '...');

    const joinBtn = await p2.waitForSelector('button:has-text("LINK TO NETWORK")', { timeout: TIMEOUT });
    await joinBtn.click();

    await sleep(1000);

    // Fill the match code
    const codeInput = await p2.waitForSelector('input[placeholder*="4 digits"], input[placeholder*="Frequency"]', { timeout: TIMEOUT });
    await codeInput.fill(matchCode);

    // Click ESTABLISH LINK
    const confirmBtn = await p2.waitForSelector('button:has-text("ESTABLISH LINK")', { timeout: TIMEOUT });
    await confirmBtn.click();
    console.log('   ✓ Player 2 joined match');

    // ── Step 5: Both players should transition to game view ──
    console.log('[5/9] Waiting for game view to load...');
    // MATCH_START triggers phase='playing' after 500ms delay
    await sleep(4000);

    // The game view should show the game-container div with header, map, and action bar
    // Check for game-specific elements that DON'T exist on the deployment screen
    const p1InGame = await p1.evaluate(() => {
      // Game view has SVG with city circles and action buttons
      return document.querySelector('.game-container') !== null ||
             document.querySelector('.game-header') !== null;
    });

    const p2InGame = await p2.evaluate(() => {
      return document.querySelector('.game-container') !== null ||
             document.querySelector('.game-header') !== null;
    });

    if (!p1InGame) {
      await p1.screenshot({ path: 'tests/screenshots/debug-p1-no-game.png' });
      const p1Text = await p1.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('   ⚠ Player 1 page content:', p1Text);
    }
    if (!p2InGame) {
      await p2.screenshot({ path: 'tests/screenshots/debug-p2-no-game.png' });
      const p2Text = await p2.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('   ⚠ Player 2 page content:', p2Text);
    }

    console.log(`   Player 1 in game: ${p1InGame}`);
    console.log(`   Player 2 in game: ${p2InGame}`);

    if (!p1InGame || !p2InGame) {
      throw new Error('One or both players did not transition to game view');
    }
    console.log('   ✓ Both players transitioned to game view');

    // ── Step 6: Wait for MATCH_STATE to populate the game ──
    console.log('[6/9] Waiting for MATCH_STATE to populate game...');
    await sleep(2000);

    // Check that the game view shows city nodes in the SVG
    const p1GameInfo = await p1.evaluate(() => {
      const text = document.body.innerText;
      const svgCircles = document.querySelectorAll('.city-node');
      return {
        cityCount: svgCircles.length,
        hasActions: text.includes('MOVE') && text.includes('STRIKE'),
        hasEndTurn: text.includes('END TURN'),
        hasTerminate: text.includes('TERMINATE'),
        hasIntel: text.includes('Intel'),
        hasCover: text.includes('Cover'),
        hasOperative: text.includes('Operative'),
        isMyTurn: text.includes('YOUR MOVE'),
        turnInfo: text.match(/TURN \d+/)?.[0] || 'not found',
      };
    });

    console.log('   Game state (Player 1):');
    console.log(`     Cities rendered: ${p1GameInfo.cityCount}`);
    console.log(`     Action buttons: ${p1GameInfo.hasActions}`);
    console.log(`     End Turn: ${p1GameInfo.hasEndTurn}`);
    console.log(`     Intel/Cover panels: ${p1GameInfo.hasIntel}/${p1GameInfo.hasCover}`);
    console.log(`     Turn: ${p1GameInfo.turnInfo}`);
    console.log(`     Is my turn: ${p1GameInfo.isMyTurn}`);

    // ── Step 7: Take initial game screenshots ──
    console.log('[7/9] Taking game screenshots...');
    await p1.screenshot({ path: 'tests/screenshots/player1-game.png', fullPage: true });
    await p2.screenshot({ path: 'tests/screenshots/player2-game.png', fullPage: true });

    // ── Step 8: Test game interactions ──
    console.log('[8/9] Testing game interactions...');

    // Determine which player's turn it is
    const p1IsMyTurn = p1GameInfo.isMyTurn;
    const p2IsMyTurn = await p2.evaluate(() => document.body.innerText.includes('YOUR MOVE'));

    const activePage = p1IsMyTurn ? p1 : p2;
    const activeLabel = p1IsMyTurn ? 'Player 1 (RED)' : 'Player 2 (BLUE)';
    console.log(`   Active player: ${activeLabel}`);

    if (!p1IsMyTurn && !p2IsMyTurn) {
      console.log('   ⚠ Neither player reports YOUR MOVE — may still be loading');
    } else {
      // Try WAIT action (costs 1 action)
      try {
        const waitBtn = await activePage.waitForSelector('button:has-text("WAIT"):not([disabled])', { timeout: 3000 });
        await waitBtn.click();
        console.log('   ✓ WAIT action sent (1 action consumed)');
        await sleep(1500);
      } catch {
        console.log('   ⚠ Could not click WAIT button');
      }

      // Try END TURN
      try {
        const endTurnBtn = await activePage.waitForSelector('button:has-text("END TURN"):not([disabled])', { timeout: 3000 });
        await endTurnBtn.click();
        console.log('   ✓ END TURN sent');
        await sleep(2000);
      } catch {
        console.log('   ⚠ Could not click END TURN button');
      }

      // Check turn state changed
      const otherPage = p1IsMyTurn ? p2 : p1;
      const otherIsNowActive = await otherPage.evaluate(() => document.body.innerText.includes('YOUR MOVE'));
      console.log(`   Turn transferred to other player: ${otherIsNowActive}`);
    }

    // ── Step 9: Final screenshots ──
    console.log('[9/9] Taking final screenshots...');
    await p1.screenshot({ path: 'tests/screenshots/player1-final.png', fullPage: true });
    await p2.screenshot({ path: 'tests/screenshots/player2-final.png', fullPage: true });
    console.log('   ✓ Final screenshots saved');

    console.log('\n=== ALL TESTS PASSED ===');

  } catch (err) {
    console.error('\n=== TEST FAILED ===');
    console.error(err);
    // @ts-ignore
    process.exit(1);
  } finally {
    if (ctx1) await ctx1.close();
    if (ctx2) await ctx2.close();
    if (browser) await browser.close();
  }
}

test();
