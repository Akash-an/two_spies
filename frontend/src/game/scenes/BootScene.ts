import Phaser from 'phaser';

/** Preloads all shared assets and shows a loading bar before transitioning to the Lobby. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    // ── Dark background ──────────────────────────────────────────
    this.cameras.main.setBackgroundColor('#0f0f23');

    // ── Title ────────────────────────────────────────────────────
    this.add
      .text(width / 2, height / 2 - 60, 'TWO SPIES', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#e0c872',
      })
      .setOrigin(0.5);

    // ── Progress bar ─────────────────────────────────────────────
    const barWidth = 320;
    const barHeight = 18;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    const bgBar = this.add.graphics();
    bgBar.fillStyle(0x222244, 1);
    bgBar.fillRect(barX, barY, barWidth, barHeight);

    const fillBar = this.add.graphics();

    const loadingText = this.add
      .text(width / 2, barY + barHeight + 16, 'Loading…', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#aaaacc',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      fillBar.clear();
      fillBar.fillStyle(0xe0c872, 1);
      fillBar.fillRect(barX + 2, barY + 2, (barWidth - 4) * value, barHeight - 4);
      loadingText.setText(`Loading… ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.setText('Ready');
    });

    // ── Placeholder assets (generate textures so we have something to load) ──
    this.generatePlaceholderTextures();
  }

  create(): void {
    // Brief pause so the player can see "Ready", then transition
    this.time.delayedCall(400, () => {
      this.scene.start('LobbyScene');
    });
  }

  /**
   * Generates simple canvas textures so scenes have sprites to work with
   * before real art assets exist.
   */
  private generatePlaceholderTextures(): void {
    // City node circle (32×32)
    if (!this.textures.exists('city')) {
      const cityGfx = this.make.graphics({ x: 0, y: 0 }, false);
      cityGfx.fillStyle(0x4488cc, 1);
      cityGfx.fillCircle(16, 16, 14);
      cityGfx.lineStyle(2, 0xffffff, 0.8);
      cityGfx.strokeCircle(16, 16, 14);
      cityGfx.generateTexture('city', 32, 32);
      cityGfx.destroy();
    }

    // Bonus city (gold ring)
    if (!this.textures.exists('city_bonus')) {
      const bonusGfx = this.make.graphics({ x: 0, y: 0 }, false);
      bonusGfx.fillStyle(0x4488cc, 1);
      bonusGfx.fillCircle(16, 16, 14);
      bonusGfx.lineStyle(3, 0xe0c872, 1);
      bonusGfx.strokeCircle(16, 16, 14);
      bonusGfx.generateTexture('city_bonus', 32, 32);
      bonusGfx.destroy();
    }

    // Pickup city (green ring)
    if (!this.textures.exists('city_pickup')) {
      const pickupGfx = this.make.graphics({ x: 0, y: 0 }, false);
      pickupGfx.fillStyle(0x4488cc, 1);
      pickupGfx.fillCircle(16, 16, 14);
      pickupGfx.lineStyle(3, 0x66cc88, 1);
      pickupGfx.strokeCircle(16, 16, 14);
      pickupGfx.generateTexture('city_pickup', 32, 32);
      pickupGfx.destroy();
    }

    // Player marker (spy icon — small red dot)
    if (!this.textures.exists('spy_marker')) {
      const spyGfx = this.make.graphics({ x: 0, y: 0 }, false);
      spyGfx.fillStyle(0xff4444, 1);
      spyGfx.fillCircle(10, 10, 8);
      spyGfx.lineStyle(2, 0xffffff, 1);
      spyGfx.strokeCircle(10, 10, 8);
      spyGfx.generateTexture('spy_marker', 20, 20);
      spyGfx.destroy();
    }

    // Highlighted city (for adjacency)
    if (!this.textures.exists('city_highlight')) {
      const hlGfx = this.make.graphics({ x: 0, y: 0 }, false);
      hlGfx.fillStyle(0x88ccff, 0.3);
      hlGfx.fillCircle(20, 20, 18);
      hlGfx.lineStyle(2, 0x88ccff, 0.8);
      hlGfx.strokeCircle(20, 20, 18);
      hlGfx.generateTexture('city_highlight', 40, 40);
      hlGfx.destroy();
    }
  }
}
