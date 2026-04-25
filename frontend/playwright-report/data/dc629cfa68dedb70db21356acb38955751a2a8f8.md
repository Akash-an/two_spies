# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test-comprehensive-two-player.spec.ts >> two-player match code flow: create match, display code, join, game
- Location: e2e/test-comprehensive-two-player.spec.ts:13:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/
Call log:
  - navigating to "http://localhost:5174/", waiting until "networkidle"

```

# Test source

```ts
  1   | /**
  2   |  * Comprehensive Test: Two-Player Match Flow with Code Verification
  3   |  * 
  4   |  * This test verifies:
  5   |  * 1. Backend generates a match code
  6   |  * 2. Frontend displays the correct code to Player 1
  7   |  * 3. Player 2 can join using that displayed code
  8   |  * 4. Both players sync and enter the game
  9   |  */
  10  | 
  11  | import { test, expect } from '@playwright/test';
  12  | 
  13  | test('two-player match code flow: create match, display code, join, game', async ({ browser }) => {
  14  |     console.log('\n╔════════════════════════════════════════════════════════════╗');
  15  |     console.log('║     TWO-PLAYER MATCH CODE VERIFICATION TEST               ║');
  16  |     console.log('╚════════════════════════════════════════════════════════════╝\n');
  17  | 
  18  |     const ctx1 = await browser.newContext();
  19  |     const ctx2 = await browser.newContext();
  20  | 
  21  |     try {
  22  |       const p1 = await ctx1.newPage();
  23  |       const p2 = await ctx2.newPage();
  24  | 
  25  |       const p1Logs: string[] = [];
  26  |       const p2Logs: string[] = [];
  27  | 
  28  |       // Intercept console logs
  29  |       p1.on('console', (msg) => {
  30  |         p1Logs.push(msg.text());
  31  |         if (msg.text().includes('[App]') || msg.text().includes('[Mission') || msg.text().includes('Match')) {
  32  |           console.log(`  [P1] ${msg.text()}`);
  33  |         }
  34  |       });
  35  | 
  36  |       p2.on('console', (msg) => {
  37  |         p2Logs.push(msg.text());
  38  |         if (msg.text().includes('[App]') || msg.text().includes('[Mission') || msg.text().includes('Match')) {
  39  |           console.log(`  [P2] ${msg.text()}`);
  40  |         }
  41  |       });
  42  | 
  43  |       // ════════════════════════════════════════════════════════════
  44  |       // PLAYER 1: SETUP
  45  |       // ════════════════════════════════════════════════════════════
  46  |       console.log('Step 1: Player 1 - Registration\n');
> 47  |       await p1.goto('http://localhost:5174', { waitUntil: 'networkidle' });
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5174/
  48  |       await p1.waitForTimeout(1000);
  49  | 
  50  |       // Enter codename
  51  |       const input1 = p1.locator('input[type="text"]').first();
  52  |       await input1.waitFor({ state: 'visible', timeout: 5000 });
  53  |       await input1.fill('PLAYER_ONE');
  54  |       console.log('  ✓ Entered codename: PLAYER_ONE');
  55  | 
  56  |       // Submit
  57  |       let submitBtn = p1.locator('button:has-text("ESTABLISH")');
  58  |       if (await submitBtn.count() > 0) {
  59  |         await submitBtn.click();
  60  |       } else {
  61  |         await p1.keyboard.press('Enter');
  62  |       }
  63  |       await p1.waitForTimeout(1500);
  64  |       console.log('  ✓ Established connection\n');
  65  | 
  66  |       // ════════════════════════════════════════════════════════════
  67  |       // PLAYER 1: INITIATE OPERATION
  68  |       // ════════════════════════════════════════════════════════════
  69  |       console.log('Step 2: Player 1 - Initiate Operation\n');
  70  |       
  71  |       const initiateBtn = p1.locator('button:has-text("INITIATE OPERATION")');
  72  |       await initiateBtn.waitFor({ state: 'visible', timeout: 5000 });
  73  |       console.log('  ✓ Found INITIATE OPERATION button');
  74  | 
  75  |       await initiateBtn.click();
  76  |       console.log('  ✓ Clicked button, waiting for modal...');
  77  |       await p1.waitForTimeout(1500);
  78  | 
  79  |       // ════════════════════════════════════════════════════════════
  80  |       // EXTRACT: Displayed Code from UI
  81  |       // ════════════════════════════════════════════════════════════
  82  |       console.log('Step 3: Extract Displayed Code\n');
  83  | 
  84  |       const titleText = p1.locator('text=SECURE FREQUENCY');
  85  |       await titleText.waitFor({ state: 'visible', timeout: 5000 });
  86  |       console.log('  ✓ Modal visible with SECURE FREQUENCY');
  87  | 
  88  |       // Find the large number element
  89  |       const frequencyElements = await p1.locator('.text-8xl').all();
  90  |       let displayedCode: string | null = null;
  91  | 
  92  |       for (const elem of frequencyElements) {
  93  |         const content = await elem.textContent();
  94  |         if (content && /^\d+$/.test(content.trim())) {
  95  |           displayedCode = content.trim();
  96  |           break;
  97  |         }
  98  |       }
  99  | 
  100 |       if (!displayedCode) {
  101 |         // Try alternative selector
  102 |         const altFreq = await p1.locator('text=/^[0-9]{4}$/').first().textContent();
  103 |         displayedCode = altFreq?.trim() || null;
  104 |       }
  105 | 
  106 |       console.log(`  ✓ Displayed code extracted: ${displayedCode}\n`);
  107 |       expect(displayedCode).toBeTruthy();
  108 |       expect(displayedCode).toMatch(/^\d+$/);
  109 | 
  110 |       // ════════════════════════════════════════════════════════════
  111 |       // EXTRACT: Backend Code from Console Logs
  112 |       // ════════════════════════════════════════════════════════════
  113 |       console.log('Step 4: Extract Backend-Generated Code\n');
  114 | 
  115 |       let backendCode: string | null = null;
  116 |       const matchCreatedLogs = p1Logs.filter((log) => log.includes('Match created'));
  117 | 
  118 |       console.log(`  Found ${matchCreatedLogs.length} relevant log entries`);
  119 | 
  120 |       for (const logLine of matchCreatedLogs) {
  121 |         // Parse code from log like: [App] Match created: {payload: {code: '2344'}, ...}
  122 |         const codeMatches = logLine.match(/code['":\s]*['":]?(\d+)/gi);
  123 |         
  124 |         if (codeMatches) {
  125 |           for (const match of codeMatches) {
  126 |             const num = match.match(/\d+/);
  127 |             if (num) {
  128 |               backendCode = num[0];
  129 |               break;
  130 |             }
  131 |           }
  132 |         }
  133 | 
  134 |         if (backendCode) break;
  135 |       }
  136 | 
  137 |       if (backendCode) {
  138 |         console.log(`  ✓ Backend code extracted: ${backendCode}\n`);
  139 |       } else {
  140 |         console.log('  ⚠ Could not extract backend code from logs\n');
  141 |       }
  142 | 
  143 |       // ════════════════════════════════════════════════════════════
  144 |       // COMPARISON
  145 |       // ════════════════════════════════════════════════════════════
  146 |       console.log('Step 5: Compare Codes\n');
  147 |       console.log(`  Displayed Code: ${displayedCode}`);
```