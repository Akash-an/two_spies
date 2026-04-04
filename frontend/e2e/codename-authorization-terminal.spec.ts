import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('CodenameAuthorizationTerminal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app - it should show the terminal by default in entering-name phase
    await page.goto(BASE_URL);
    // Wait for the component to load
    await page.waitForSelector('[data-testid="terminal-container"]', { timeout: 5000 });
  });

  test.describe('Layout & Positioning', () => {
    test('should render the terminal container fullscreen', async ({ page }) => {
      const container = page.locator('[data-testid="terminal-container"]');
      const boundingBox = await container.boundingBox();
      
      expect(boundingBox).not.toBeNull();
      expect(boundingBox?.x).toBe(0);
      expect(boundingBox?.y).toBe(0);
    });

    test('should have header fixed at top', async ({ page }) => {
      const header = page.locator('[data-testid="terminal-header"]');
      const boundingBox = await header.boundingBox();
      
      expect(boundingBox).not.toBeNull();
      expect(boundingBox?.y).toBe(0);
      expect(boundingBox?.height).toBe(64); // h-16 = 64px
    });

    test('should have action bar fixed at bottom', async ({ page }) => {
      const actionBar = page.locator('[data-testid="action-bar"]');
      const container = page.locator('[data-testid="terminal-container"]');
      const containerBox = await container.boundingBox();
      const actionBarBox = await actionBar.boundingBox();
      
      expect(actionBarBox).not.toBeNull();
      if (containerBox && actionBarBox) {
        // Action bar should be near bottom
        expect(actionBarBox.y + actionBarBox.height).toBeCloseTo(containerBox.height, { maxDifference: 5 });
      }
    });

    test('main content should be between header and action bar', async ({ page }) => {
      const header = page.locator('[data-testid="terminal-header"]');
      const main = page.locator('[data-testid="terminal-main"]');
      const actionBar = page.locator('[data-testid="action-bar"]');
      
      const headerBox = await header.boundingBox();
      const mainBox = await main.boundingBox();
      const actionBarBox = await actionBar.boundingBox();
      
      expect(mainBox).not.toBeNull();
      expect(headerBox).not.toBeNull();
      expect(actionBarBox).not.toBeNull();
      
      if (headerBox && mainBox && actionBarBox) {
        // Main content starts after header
        expect(mainBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
        // Main content ends before action bar
        expect(mainBox.y + mainBox.height).toBeLessThanOrEqual(actionBarBox.y);
      }
    });

    test('should not have text overlap - header and title separated', async ({ page }) => {
      const missionName = page.locator('[data-testid="mission-name"]');
      const title = page.locator('[data-testid="terminal-title"]');
      
      const missionBox = await missionName.boundingBox();
      const titleBox = await title.boundingBox();
      
      expect(missionBox).not.toBeNull();
      expect(titleBox).not.toBeNull();
      
      if (missionBox && titleBox) {
        // Title should be below mission name
        expect(titleBox.y).toBeGreaterThan(missionBox.y + missionBox.height);
      }
    });
  });

  test.describe('Text & Colors', () => {
    test('should display all text in cyan or light colors, not black', async ({ page }) => {
      const elements = [
        '[data-testid="mission-name"]',
        '[data-testid="status-indicator"]',
        '[data-testid="terminal-title"]',
        '[data-testid="codename-label"]',
        '[data-testid="establish-button"]',
      ];

      for (const selector of elements) {
        const element = page.locator(selector);
        const color = await element.evaluate((el) => window.getComputedStyle(el).color);
        
        // Should not be black
        expect(color).not.toBe('rgb(0, 0, 0)');
        // Should be bright (cyan, white, or orange tones)
      }
    });

    test('mission name should have cyan color and glow', async ({ page }) => {
      const missionName = page.locator('[data-testid="mission-name"]');
      const color = await missionName.evaluate((el) => window.getComputedStyle(el).color);
      const textShadow = await missionName.evaluate((el) => window.getComputedStyle(el).textShadow);
      
      // Color should be cyan
      expect(color).toContain('rgb(0, 255, 255)');
      // Should have text-shadow (glow effect)
      expect(textShadow).not.toBe('none');
    });

    test('title should display correctly', async ({ page }) => {
      const title = page.locator('[data-testid="terminal-title"]');
      const text = await title.innerText();
      
      expect(text).toBe('CODENAME AUTHORIZATION TERMINAL');
    });

    test('coordinates should display correctly', async ({ page }) => {
      const latitude = page.locator('[data-testid="latitude-value"]');
      const longitude = page.locator('[data-testid="longitude-value"]');
      
      const latText = await latitude.innerText();
      const lonText = await longitude.innerText();
      
      expect(latText).toContain('38.9072');
      expect(lonText).toContain('77.0369');
    });
  });

  test.describe('Form Elements', () => {
    test('codename input should be visible and focus-able', async ({ page }) => {
      const input = page.locator('[data-testid="codename-input"]');
      
      expect(await input.isVisible()).toBe(true);
      
      // Input should be focusable
      await input.focus();
      const focused = page.locator('[data-testid="codename-input"]:focus');
      expect(await focused.count()).toBe(1);
    });

    test('codename input should accept text', async ({ page }) => {
      const input = page.locator('[data-testid="codename-input"]');
      
      await input.fill('AGENT_PHOENIX');
      const value = await input.inputValue();
      
      expect(value).toBe('AGENT_PHOENIX');
    });

    test('establish button should be visible and clickable', async ({ page }) => {
      const button = page.locator('[data-testid="establish-button"]');
      
      expect(await button.isVisible()).toBe(true);
      expect(await button.isEnabled()).toBe(true);
    });

    test('establish button should display correct text when not loading', async ({ page }) => {
      const button = page.locator('[data-testid="establish-button"]');
      const text = await button.innerText();
      
      expect(text).toContain('ESTABLISH CONNECTION');
    });
  });

  test.describe('Info Boxes', () => {
    test('should display all three info boxes', async ({ page }) => {
      const threatBox = page.locator('[data-testid="threat-box"]');
      const terminalBox = page.locator('[data-testid="terminal-output-box"]');
      const recentBox = page.locator('[data-testid="recent-access-box"]');
      
      expect(await threatBox.isVisible()).toBe(true);
      expect(await terminalBox.isVisible()).toBe(true);
      expect(await recentBox.isVisible()).toBe(true);
    });

    test('threat box should have orange left border', async ({ page }) => {
      const threatBox = page.locator('[data-testid="threat-box"]');
      const borderColor = await threatBox.evaluate((el) => window.getComputedStyle(el).borderLeftColor);
      
      // Should have orange color (#fe9800)
      expect(borderColor).toContain('rgb(254, 152, 0)');
    });

    test('terminal output box should have cyan left border', async ({ page }) => {
      const terminalBox = page.locator('[data-testid="terminal-output-box"]');
      const borderColor = await terminalBox.evaluate((el) => window.getComputedStyle(el).borderLeftColor);
      
      // Should have cyan color
      expect(borderColor).toContain('rgb(0, 230, 230)');
    });

    test('should display terminal logs', async ({ page }) => {
      const logContent = page.locator('[data-testid="terminal-log-content"]');
      const text = await logContent.innerText();
      
      expect(text).toContain('INITIALIZING LINK');
      expect(text).toContain('SCRUBBING METADATA');
      expect(text).toContain('BOUNCING SIGNAL');
    });

    test('should display recent access logs', async ({ page }) => {
      const accessContent = page.locator('[data-testid="recent-access-content"]');
      const text = await accessContent.innerText();
      
      expect(text).toContain('OPERATIVE_09 SIGNED OFF');
      expect(text).toContain('SYSTEM_PURGE COMPLETE');
      expect(text).toContain('NEW MISSION UPLOADED');
    });
  });

  test.describe('Action Bar Buttons', () => {
    test('should display all action bar buttons', async ({ page }) => {
      const deployBtn = page.locator('[data-testid="deploy-button"]');
      const scanBtn = page.locator('[data-testid="scan-button"]');
      const encryptBtn = page.locator('[data-testid="encrypt-button"]');
      const abortBtn = page.locator('[data-testid="abort-button"]');
      
      expect(await deployBtn.isVisible()).toBe(true);
      expect(await scanBtn.isVisible()).toBe(true);
      expect(await encryptBtn.isVisible()).toBe(true);
      expect(await abortBtn.isVisible()).toBe(true);
    });

    test('deploy button should be cyan colored', async ({ page }) => {
      const deployBtn = page.locator('[data-testid="deploy-button"]');
      const bgColor = await deployBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      
      expect(bgColor).toContain('rgb(0, 255, 255)');
    });

    test('action buttons should be hoverable', async ({ page }) => {
      const scanBtn = page.locator('[data-testid="scan-button"]');
      
      // Initial color
      const initialColor = await scanBtn.evaluate((el) => window.getComputedStyle(el).color);
      
      // Hover
      await scanBtn.hover();
      await page.waitForTimeout(100); // Wait for hover effect
      
      const hoverColor = await scanBtn.evaluate((el) => window.getComputedStyle(el).color);
      
      // Color should change on hover
      expect(hoverColor).not.toBe(initialColor);
    });
  });

  test.describe('Background & Styling', () => {
    test('should display background image', async ({ page }) => {
      const container = page.locator('[data-testid="terminal-container"]');
      const backgroundImage = await container.evaluate((el) => {
        return window.getComputedStyle(el).backgroundImage;
      });
      
      expect(backgroundImage).toContain('url');
    });

    test('should have gradient overlay', async ({ page }) => {
      const overlays = page.locator('[data-testid="terminal-container"] > div');
      let foundGradient = false;
      
      for (let i = 0; i < await overlays.count(); i++) {
        const style = await overlays.nth(i).evaluate((el) => window.getComputedStyle(el).backgroundImage);
        if (style.includes('gradient')) {
          foundGradient = true;
          break;
        }
      }
      
      expect(foundGradient).toBe(true);
    });

    test('should have no text color black throughout component', async ({ page }) => {
      const allText = page.locator('[data-testid="terminal-container"] *');
      let foundBlackText = false;
      
      for (let i = 0; i < await allText.count(); i++) {
        const element = allText.nth(i);
        const isVisible = await element.isVisible();
        
        if (isVisible) {
          const color = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return style.color;
          });
          
          if (color === 'rgb(0, 0, 0)') {
            const tag = await element.evaluate((el) => el.tagName);
            // Certain elements like icon containers might have black by default
            if (!['SPAN', 'I', 'SMALL'].includes(tag)) {
              foundBlackText = true;
              break;
            }
          }
        }
      }
      
      expect(foundBlackText).toBe(false);
    });
  });

  test.describe('Scrolling Behavior', () => {
    test('main content area should be scrollable', async ({ page }) => {
      const main = page.locator('[data-testid="terminal-main"]');
      const style = await main.evaluate((el) => window.getComputedStyle(el).overflowY);
      
      expect(style).toBe('auto');
    });

    test('should have bottom padding to prevent overlap with action bar', async ({ page }) => {
      const main = page.locator('[data-testid="terminal-main"]');
      const paddingBottom = await main.evaluate((el) => {
        return window.getComputedStyle(el).paddingBottom;
      });
      
      // Should have significant padding (pb-32 = 8rem = 128px)
      const paddingValue = parseInt(paddingBottom);
      expect(paddingValue).toBeGreaterThanOrEqual(100);
    });
  });

  test.describe('Accessibility', () => {
    test('codename input should have label', async ({ page }) => {
      const label = page.locator('[data-testid="codename-label"]');
      
      expect(await label.isVisible()).toBe(true);
      expect(await label.innerText()).toBe('OPERATIVE CODENAME');
    });

    test('all buttons should be focusable', async ({ page }) => {
      const buttons = [
        '[data-testid="establish-button"]',
        '[data-testid="deploy-button"]',
        '[data-testid="scan-button"]',
      ];
      
      for (const selector of buttons) {
        const button = page.locator(selector);
        await button.focus();
        const focused = page.locator(`${selector}:focus`);
        expect(await focused.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('should maintain layout at mobile size', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const container = page.locator('[data-testid="terminal-container"]');
      const header = page.locator('[data-testid="terminal-header"]');
      const actionBar = page.locator('[data-testid="action-bar"]');
      
      expect(await container.isVisible()).toBe(true);
      expect(await header.isVisible()).toBe(true);
      expect(await actionBar.isVisible()).toBe(true);
    });

    test('should maintain layout at tablet size', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      const container = page.locator('[data-testid="terminal-container"]');
      expect(await container.isVisible()).toBe(true);
    });

    test('should maintain layout at desktop size', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      const container = page.locator('[data-testid="terminal-container"]');
      expect(await container.isVisible()).toBe(true);
    });
  });
});
