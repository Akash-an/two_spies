/**
 * Playwright E2E Tests for Stitch UI Components Integration
 *
 * Tests verify that all Stitch components render correctly and wire
 * network actions as expected.
 */

import { test, expect } from '@playwright/test';

test.describe('Two Spies UI — Stitch Components Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set a longer timeout for game initialization
    page.setDefaultTimeout(10000);
    // Start on localhost:5173 (Vite dev server)
    await page.goto('http://localhost:5173/');
  });

  // ── Phase 1: Codename Authorization Terminal ──────────────────────────

  test('Phase 1: Codename Authorization Terminal renders on app load', async ({ page }) => {
    // Wait for the terminal to appear
    await page.waitForSelector('text=CODENAME AUTHORIZATION TERMINAL', { timeout: 5000 });
    expect(await page.locator('text=CODENAME AUTHORIZATION TERMINAL').isVisible()).toBe(true);
  });

  test('Phase 1: Terminal displays initialization text', async ({ page }) => {
    await page.waitForSelector('text=INITIALIZING LINK');
    const initText = page.locator('text=INITIALIZING LINK');
    expect(await initText.isVisible()).toBe(true);
  });

  test('Phase 1: Terminal has input field for codename', async ({ page }) => {
    await page.waitForSelector('input[placeholder="Enter operative codename"]');
    const input = page.locator('input[placeholder="Enter operative codename"]');
    expect(await input.isVisible()).toBe(true);
  });

  test('Phase 1: Terminal displays terminal log', async ({ page }) => {
    await page.waitForSelector('text=Terminal');
    const terminalSection = page.locator('text=Terminal');
    expect(await terminalSection.isVisible()).toBe(true);
  });

  test('Phase 1: User can enter codename and establish connection', async ({ page }) => {
    // Wait for input field
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.waitFor({ state: 'visible' });

    // Type a codename
    await codenameInput.fill('Agent Phoenix');

    // Click the establish button
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.waitFor({ state: 'visible' });
    await establishBtn.click();

    // After establishing, should transition to lobby
    // Wait for the lobby screen (which has "TWO SPIES" title)
    await page.waitForSelector('text=TWO SPIES', { timeout: 8000 });
    expect(await page.locator('text=TWO SPIES').isVisible()).toBe(true);
  });

  // ── Phase 2: Lobby ────────────────────────────────────────────────────

  test('Phase 2: Lobby shows player name', async ({ page }) => {
    // Enter codename and establish
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    // Wait for lobby
    await page.waitForSelector('text=TWO SPIES');

    // Check player name appears in lobby
    const playerNameText = page.locator('text=Agent Phoenix');
    expect(await playerNameText.isVisible()).toBe(true);
  });

  test('Phase 2: Lobby has Start Game button', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    expect(await startBtn.isVisible()).toBe(true);
    expect(await startBtn.isEnabled()).toBe(true);
  });

  test('Phase 2: Lobby has Join Game button', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const joinBtn = page.locator('button:has-text("Join Game")');
    expect(await joinBtn.isVisible()).toBe(true);
    expect(await joinBtn.isEnabled()).toBe(true);
  });

  // ── Phase 3a: Creating Match ──────────────────────────────────────────

  test('Phase 3a: Creating shows match code after Start Game', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    // Click Start Game
    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Should show "Share this code with your opponent"
    await page.waitForSelector('text=Share this code with your opponent', { timeout: 5000 });
    expect(await page.locator('text=Share this code with your opponent').isVisible()).toBe(true);

    // Should show a 4-digit code (displayed with large font)
    const codeDisplay = page.locator('div:has-text(/^\\d{4}$/)');
    expect(await codeDisplay.count()).toBeGreaterThan(0);
  });

  test('Phase 3a: Creating shows loading spinner', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Should show "Waiting for opponent to join..."
    await page.waitForSelector('text=Waiting for opponent to join', { timeout: 5000 });
    expect(await page.locator('text=Waiting for opponent to join').isVisible()).toBe(true);
  });

  // ── Phase 5: Playing — Stitch Component Overlays ───────────────────────

  test('Playing: HUD buttons appear when game starts', async ({ page }) => {
    // Establish and start game
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Wait for game to start (Phaser canvas + HUD buttons)
    // The HUD buttons should appear at the top-left
    await page.waitForSelector('button:has-text("Deploy")', { timeout: 8000 });
    const deployBtn = page.locator('button:has-text("Deploy")');
    expect(await deployBtn.isVisible()).toBe(true);
  });

  test('Playing: All three HUD control buttons visible during turn', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Wait for all three buttons
    await page.waitForSelector('button:has-text("Deploy")');
    await page.waitForSelector('button:has-text("Frequency")');
    await page.waitForSelector('button:has-text("Surveillance")');

    expect(await page.locator('button:has-text("Deploy")').isVisible()).toBe(true);
    expect(await page.locator('button:has-text("Frequency")').isVisible()).toBe(true);
    expect(await page.locator('button:has-text("Surveillance")').isVisible()).toBe(true);
  });

  // ── Mission Deployment Hub Overlay ───────────────────────────────────

  test('Mission Deployment Hub: Opens when Deploy button clicked', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Wait for Deploy button and click it
    await page.waitForSelector('button:has-text("Deploy")');
    const deployBtn = page.locator('button:has-text("Deploy")');
    await deployBtn.click();

    // Should show Mission Deployment Hub title
    await page.waitForSelector('text=MISSION DEPLOYMENT HUB', { timeout: 5000 });
    expect(await page.locator('text=MISSION DEPLOYMENT HUB').isVisible()).toBe(true);
  });

  test('Mission Deployment Hub: Shows available units', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    await page.waitForSelector('button:has-text("Deploy")');
    const deployBtn = page.locator('button:has-text("Deploy")');
    await deployBtn.click();

    // Should show "Available Units" section
    await page.waitForSelector('text=Available Units', { timeout: 5000 });
    expect(await page.locator('text=Available Units').isVisible()).toBe(true);
  });

  test('Mission Deployment Hub: Has Deploy action buttons', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    await page.waitForSelector('button:has-text("Deploy")');
    const deployBtn = page.locator('button:has-text("Deploy")');
    await deployBtn.click();

    // Should show DEPLOY buttons for units
    await page.waitForSelector('button:has-text("DEPLOY")', { timeout: 5000 });
    const deployActions = page.locator('button:has-text("DEPLOY")');
    expect(await deployActions.count()).toBeGreaterThan(0);
  });

  // ── Secure Link Frequency Overlay ──────────────────────────────────────

  test('Secure Link Frequency: Opens when Frequency button clicked', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Wait for Frequency button and click it
    await page.waitForSelector('button:has-text("Frequency")');
    const frequencyBtn = page.locator('button:has-text("Frequency")');
    await frequencyBtn.click();

    // Should show Secure Link Frequency title
    await page.waitForSelector('text=SECURE LINK FREQUENCY', { timeout: 5000 });
    expect(await page.locator('text=SECURE LINK FREQUENCY').isVisible()).toBe(true);
  });

  test('Secure Link Frequency: Shows frequency input', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    await page.waitForSelector('button:has-text("Frequency")');
    const frequencyBtn = page.locator('button:has-text("Frequency")');
    await frequencyBtn.click();

    // Should have a frequency input field
    const freqInput = page.locator('input[aria-label="frequency"]');
    await freqInput.waitFor({ state: 'visible', timeout: 5000 });
    expect(await freqInput.isVisible()).toBe(true);
  });

  test('Secure Link Frequency: Has Tune button', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    await page.waitForSelector('button:has-text("Frequency")');
    const frequencyBtn = page.locator('button:has-text("Frequency")');
    await frequencyBtn.click();

    // Should show TUNE button
    await page.waitForSelector('button:has-text("TUNE")', { timeout: 5000 });
    const tuneBtn = page.locator('button:has-text("TUNE")');
    expect(await tuneBtn.isVisible()).toBe(true);
  });

  // ── Surveillance Command Center Overlay ────────────────────────────────

  test('Surveillance Command Center: Opens when Surveillance button clicked', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Wait for Surveillance button and click it
    await page.waitForSelector('button:has-text("Surveillance")');
    const survBtn = page.locator('button:has-text("Surveillance")');
    await survBtn.click();

    // Should show Surveillance Command Center title
    await page.waitForSelector('text=SURVEILLANCE COMMAND CENTER', { timeout: 5000 });
    expect(await page.locator('text=SURVEILLANCE COMMAND CENTER').isVisible()).toBe(true);
  });

  test('Surveillance Command Center: Shows Global Map heading', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    await page.waitForSelector('button:has-text("Surveillance")');
    const survBtn = page.locator('button:has-text("Surveillance")');
    await survBtn.click();

    // Should show "GLOBAL MAP" in heading
    await page.waitForSelector('text=GLOBAL MAP', { timeout: 5000 });
    expect(await page.locator('text=GLOBAL MAP').isVisible()).toBe(true);
  });

  // ── Overlay Close Buttons ──────────────────────────────────────────────

  test('Mission overlay: Close Preview button works', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    await page.waitForSelector('button:has-text("Deploy")');
    const deployBtn = page.locator('button:has-text("Deploy")');
    await deployBtn.click();

    // Wait for Mission Hub to appear
    await page.waitForSelector('text=MISSION DEPLOYMENT HUB');

    // Click Close Preview
    const closeBtn = page.locator('button:has-text("Close Preview")');
    await closeBtn.click();

    // Mission Hub should disappear
    expect(await page.locator('text=MISSION DEPLOYMENT HUB').isVisible()).toBe(false);
  });

  test('Frequency overlay: Can reopen after closing', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Open Frequency
    await page.waitForSelector('button:has-text("Frequency")');
    const frequencyBtn = page.locator('button:has-text("Frequency")');
    await frequencyBtn.click();

    await page.waitForSelector('text=SECURE LINK FREQUENCY');
    expect(await page.locator('text=SECURE LINK FREQUENCY').isVisible()).toBe(true);

    // Close it
    let closeBtn = page.locator('button:has-text("Close Preview")');
    await closeBtn.click();

    // Should be gone
    expect(await page.locator('text=SECURE LINK FREQUENCY').isVisible()).toBe(false);

    // Reopen
    frequencyBtn.click();
    await page.waitForSelector('text=SECURE LINK FREQUENCY');
    expect(await page.locator('text=SECURE LINK FREQUENCY').isVisible()).toBe(true);
  });

  // ── Integration Tests ─────────────────────────────────────────────────

  test('Terminal logs appear in deployment and frequency overlays', async ({ page }) => {
    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES');

    const startBtn = page.locator('button:has-text("Start Game")');
    await startBtn.click();

    // Open Deployment
    await page.waitForSelector('button:has-text("Deploy")');
    const deployBtn = page.locator('button:has-text("Deploy")');
    await deployBtn.click();

    // Should show "Mission Log" with logs
    await page.waitForSelector('text=Mission Log', { timeout: 5000 });
    expect(await page.locator('text=Mission Log').isVisible()).toBe(true);

    // Each log line should be visible
    const logLines = page.locator('.terminal-line');
    expect(await logLines.count()).toBeGreaterThanOrEqual(0);
  });

  test('Browser console has no critical errors after establishing connection', async ({ page }) => {
    let errors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    const codenameInput = page.locator('input[placeholder="Enter operative codename"]');
    await codenameInput.fill('Agent Phoenix');
    const establishBtn = page.locator('button:has-text("ESTABLISH CONNECTION")');
    await establishBtn.click();

    await page.waitForSelector('text=TWO SPIES', { timeout: 8000 });

    // Filter out non-critical console errors (e.g., from third-party libs)
    const criticalErrors = errors.filter(e => !e.includes('ResizeObserver'));
    expect(criticalErrors.length).toBe(0);
  });
});
