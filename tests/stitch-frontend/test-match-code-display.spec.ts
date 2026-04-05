import { test, expect } from '@playwright/test';

test.describe('Match Code Generation - Backend Generated Code Displayed', () => {
  const BASE_URL = 'http://localhost:5174';

  test('should display the actual backend-generated match code, not a local one', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Collect logs and parsed messages
    const logs: string[] = [];

    page1.on('console', (msg) => {
      console.log(`[Player 1] ${msg.text()}`);
      logs.push(msg.text());
    });

    console.log('\n=== TEST: Match Code Display ===');
    console.log('Opening game...');
    
    await page1.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page1.waitForTimeout(1000);

    // Register Player 1
    console.log('Registering codename...');
    const input = page1.locator('input[type="text"]');
    await input.waitFor({ state: 'visible' });
    await input.fill('TEST_AGENT');
    await page1.waitForTimeout(300);

    // Submit codename
    const submitBtn = page1.locator('button:has-text("ESTABLISH")');
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
    } else {
      await page1.keyboard.press('Enter');
    }
    await page1.waitForTimeout(1000);

    // Click INITIATE OPERATION
    console.log('Clicking INITIATE OPERATION...');
    const initiateBtn = page1.locator('button:has-text("INITIATE OPERATION")');
    await initiateBtn.waitFor({ state: 'visible', timeout: 5000 });
    await initiateBtn.click();
    await page1.waitForTimeout(500);

    // Extract backend match code from console logs
    let backendMatchCode: string | null = null;
    let attempts = 0;
    const maxAttempts = 30;

    while (!backendMatchCode && attempts < maxAttempts) {
      const matchCreatedLogs = logs.filter((log) => log.includes('[App] Match created:'));
      
      for (const logLine of matchCreatedLogs) {
        // Parse the JSON from the log
        // Expected: [App] Match created: {payload: {…}, sessionId: 'match-XXX', type: 'MATCH_CREATED'}
        console.log(`Checking log: ${logLine}`);
        
        // Try to extract code using regex or parsing
        const codeMatch = logLine.match(/code['":\s]*['":]?(\d+)['":\s]*\}/);
        if (codeMatch) {
          backendMatchCode = codeMatch[1];
          console.log(`✓ Extracted backend code from log: ${backendMatchCode}`);
          break;
        }
      }

      if (!backendMatchCode) {
        await page1.waitForTimeout(100);
        attempts++;
      }
    }

    expect(backendMatchCode).toBeTruthy();
    console.log(`✓ Backend-generated match code: ${backendMatchCode}`);

    // Wait for frequency modal to appear
    console.log('Waiting for frequency modal...');
    const frequencyDisplay = page1.locator('div:has-text("GHZ_FREQUENCY_LOCKED")');
    await frequencyDisplay.waitFor({ state: 'visible', timeout: 5000 });
    
    // Extract the displayed frequency from the modal
    const frequencyText = await page1.locator(
      '.text-8xl:has-text("[0-9]")'
    ).first().textContent();
    
    console.log(`Displayed frequency in modal: ${frequencyText?.trim()}`);

    // Verify the displayed code matches the backend code
    expect(frequencyText?.trim()).toBe(backendMatchCode);
    console.log(`✅ PASS: Displayed code (${frequencyText?.trim()}) matches backend code (${backendMatchCode})`);

    // Verify the modal shows "SECURE FREQUENCY" header
    const headerText = await page1.locator('text=SECURE FREQUENCY').textContent();
    expect(headerText).toContain('SECURE FREQUENCY');
    console.log('✅ PASS: Modal shows "SECURE FREQUENCY" header');

    // Check console logs don't have mismatches
    console.log('\nFinal console logs (relevant):');
    logs
      .filter(
        (log) =>
          log.includes('[App]') ||
          log.includes('[WS]') ||
          log.includes('FREQUENCY') ||
          log.includes('MATCH')
      )
      .slice(-5)
      .forEach((log) => console.log(`  ${log}`));

    await context1.close();
  });
});
