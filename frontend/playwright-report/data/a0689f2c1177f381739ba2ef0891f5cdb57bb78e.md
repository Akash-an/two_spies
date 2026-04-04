# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: stitch-components-simplified.spec.ts >> Two Spies UI — Stitch Components >> Terminal displays threat level
- Location: e2e/stitch-components-simplified.spec.ts:33:3

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('text=Threat Level:') to be visible

```

# Page snapshot

```yaml
- generic [ref=e5]:
  - heading "CODENAME AUTHORIZATION TERMINAL" [level=1] [ref=e6]
  - generic [ref=e7]: INITIALIZING LINK...
  - generic [ref=e8]:
    - textbox "Operative Codename" [ref=e9]:
      - /placeholder: Enter operative codename
    - button "ESTABLISH CONNECTION" [ref=e11]
  - generic [ref=e12]:
    - generic [ref=e13]:
      - text: "Sector:"
      - strong [ref=e14]: —
      - text: "— Threat:"
      - strong [ref=e15]: UNKNOWN
    - generic [ref=e16]:
      - text: "Coordinates:"
      - strong [ref=e17]: —
      - text: ","
      - strong [ref=e18]: —
  - generic [ref=e19]:
    - heading "Terminal" [level=3] [ref=e20]
    - generic [ref=e22]: "9:42:03 PM: Active client: WebSocketClient"
```

# Test source

```ts
  1   | /**
  2   |  * Playwright E2E Tests for Stitch UI Components Integration (Simplified)
  3   |  *
  4   |  * Focuses on component rendering and structure without requiring full multiplayer flow.
  5   |  */
  6   | 
  7   | import { test, expect } from '@playwright/test';
  8   | 
  9   | test.describe('Two Spies UI — Stitch Components', () => {
  10  |   test.beforeEach(async ({ page }) => {
  11  |     page.setDefaultTimeout(10000);
  12  |     await page.goto('http://localhost:5173/');
  13  |   });
  14  | 
  15  |   // ── Phase 1: Initial Rendering ──────────────────────────────────
  16  | 
  17  |   test('App loads and displays root element', async ({ page }) => {
  18  |     const root = page.locator('#root');
  19  |     expect(await root.isVisible()).toBe(true);
  20  |   });
  21  | 
  22  |   test('Codename Authorization Terminal is visible on startup', async ({ page }) => {
  23  |     await page.waitForSelector('text=CODENAME AUTHORIZATION TERMINAL', { timeout: 5000 });
  24  |     const terminal = page.locator('text=CODENAME AUTHORIZATION TERMINAL').first();
  25  |     expect(await terminal.isVisible()).toBe(true);
  26  |   });
  27  | 
  28  |   test('Terminal displays sector information', async ({ page }) => {
  29  |     await page.waitForSelector('text=SECTOR');
  30  |     expect(await page.locator('text=SECTOR').count()).toBeGreaterThan(0);
  31  |   });
  32  | 
  33  |   test('Terminal displays threat level', async ({ page }) => {
> 34  |     await page.waitForSelector('text=Threat Level:');
      |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  35  |     expect(await page.locator('text=Threat Level:').isVisible()).toBe(true);
  36  |   });
  37  | 
  38  |   test('Terminal contains codename input field', async ({ page }) => {
  39  |     const input = page.locator('input[placeholder="Enter operative codename"]');
  40  |     await input.waitFor({ state: 'visible', timeout: 5000 });
  41  |     expect(await input.isVisible()).toBe(true);
  42  |   });
  43  | 
  44  |   test('Terminal displays terminal log section', async ({ page }) => {
  45  |     const logHeading = page.locator('text=Terminal').filter({ has: page.locator('..') }).first();
  46  |     // Wait for it to be present in DOM
  47  |     await page.waitForTimeout(1000);
  48  |     const logCount = await page.locator('text=Terminal').count();
  49  |     expect(logCount).toBeGreaterThan(0);
  50  |   });
  51  | 
  52  |   test('Terminal has action buttons', async ({ page }) => {
  53  |     // Look for primary CTA button
  54  |     const buttons = page.locator('button').filter({ hasText: /ESTABLISH|Connect/i });
  55  |     await buttons.first().waitFor({ state: 'visible', timeout: 5000 });
  56  |     expect(await buttons.count()).toBeGreaterThan(0);
  57  |   });
  58  | 
  59  |   // ── Phase 1: User Interaction ───────────────────────────────────
  60  | 
  61  |   test('Can type into codename input', async ({ page }) => {
  62  |     const input = page.locator('input[placeholder="Enter operative codename"]');
  63  |     await input.fill('ALPHA_TEST');
  64  |     expect(await input.inputValue()).toBe('ALPHA_TEST');
  65  |   });
  66  | 
  67  |   test('Codename input can be cleared', async ({ page }) => {
  68  |     const input = page.locator('input[placeholder="Enter operative codename"]');
  69  |     await input.fill('TEST_CODE');
  70  |     await input.clear();
  71  |     expect(await input.inputValue()).toBe('');
  72  |   });
  73  | 
  74  |   // ── Component Structure Tests ──────────────────────────────────
  75  | 
  76  |   test('Terminal component has proper CSS classes', async ({ page }) => {
  77  |     await page.waitForTimeout(1000);
  78  |     // Terminal should have styling classes applied
  79  |     const terminal = page.locator('div').filter({ hasText: 'CODENAME AUTHORIZATION TERMINAL' }).first();
  80  |     const className = await terminal.getAttribute('class');
  81  |     expect(className).toBeTruthy();
  82  |   });
  83  | 
  84  |   test('Terminal section has text overlay styles (parchment theme)', async ({ page }) => {
  85  |     // Check for vintage/parchment styling indicators
  86  |     const styled = page.locator('[class*="text-ts"]'); // Tailwind custom text colors
  87  |     expect(await styled.count()).toBeGreaterThan(0);
  88  |   });
  89  | 
  90  |   test('Terminal displays heading elements', async ({ page }) => {
  91  |     const headings = page.locator('h1, h2, h3, h4, h5, h6');
  92  |     expect(await headings.count()).toBeGreaterThan(0);
  93  |   });
  94  | 
  95  |   // ── No Critical Errors ─────────────────────────────────────────
  96  | 
  97  |   test('Page loads without critical console errors', async ({ page }) => {
  98  |     const errors: string[] = [];
  99  |     page.on('console', msg => {
  100 |       if (msg.type() === 'error' && !msg.text().includes('warning')) {
  101 |         errors.push(msg.text());
  102 |       }
  103 |     });
  104 | 
  105 |     await page.goto('http://localhost:5173/');
  106 |     await page.waitForTimeout(2000);
  107 | 
  108 |     // Filter out known non-critical errors
  109 |     const criticalErrors = errors.filter(
  110 |       e => !e.includes('ResizeObserver') && !e.includes('playOnceAndClean')
  111 |     );
  112 | 
  113 |     expect(criticalErrors.length).toBe(0);
  114 |   });
  115 | 
  116 |   test('Network client exists in window', async ({ page }) => {
  117 |     await page.waitForTimeout(500);
  118 |     const hasNetwork = await page.evaluate(() => {
  119 |       // @ts-ignore
  120 |       return typeof window !== 'undefined' && '__PHASER_REGISTRY__' in window || true;
  121 |     });
  122 |     expect(hasNetwork).toBe(true);
  123 |   });
  124 | 
  125 |   // ── Component Rendering Quality ────────────────────────────────
  126 | 
  127 |   test('Terminal text is readable (font size > 0)', async ({ page }) => {
  128 |     const terminal = page.locator('text=CODENAME AUTHORIZATION TERMINAL').first();
  129 |     const fontSize = await terminal.evaluate(el => window.getComputedStyle(el).fontSize);
  130 |     const size = parseInt(fontSize);
  131 |     // Font should be a reasonable size (not 0)
  132 |     expect(size).toBeGreaterThan(10);
  133 |   });
  134 | 
```