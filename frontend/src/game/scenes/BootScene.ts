import Phaser from 'phaser';

/** Preloads all shared assets and shows a loading bar before transitioning to the Lobby. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    // ── Vintage parchment background ─────────────────────────────
    this.cameras.main.setBackgroundColor('#6db5ae');

    // ── Title ────────────────────────────────────────────────────
    this.add
      .text(width / 2, height / 2 - 60, 'TWO SPIES', {
        fontFamily: "'Georgia', serif",
        fontSize: '36px',
        color: '#2a1a0a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 28, 'a game of espionage', {
        fontFamily: "'Georgia', serif",
        fontSize: '14px',
        color: '#5a3a1a',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // ── Progress bar ─────────────────────────────────────────────
    const barWidth = 320;
    const barHeight = 12;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2 + 20;

    const bgBar = this.add.graphics();
    bgBar.fillStyle(0xc8a96e, 1);  // PARCHMENT_DARK track
    bgBar.fillRoundedRect(barX, barY, barWidth, barHeight, 3);

    const fillBar = this.add.graphics();

    const loadingText = this.add
      .text(width / 2, barY + barHeight + 14, 'Loading...', {
        fontFamily: "'Georgia', serif",
        fontSize: '13px',
        color: '#5a3a1a',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      fillBar.clear();
      fillBar.fillStyle(0xc0392b, 1);  // ACTIONS_RED fill
      fillBar.fillRoundedRect(barX + 2, barY + 2, (barWidth - 4) * value, barHeight - 4, 2);
      loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.setText('Ready');
    });

    // ── Load map background ───────────────────────────────────────
    this.load.svg('europe_map', 'europe_map.svg', { width: 1280, height: 720 });

    // ── Placeholder assets ────────────────────────────────────────
    this.generatePlaceholderTextures();
  }

  create(): void {
    this.time.delayedCall(400, () => {
      this.scene.start('LobbyScene');
    });
  }

  /**
   * Generates parchment-style canvas textures matching the vintage Cold War aesthetic.
   */
  private generatePlaceholderTextures(): void {
    // City node — hollow circle, parchment fill + dark ink stroke
    if (!this.textures.exists('city')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xf5f0d8, 1);   // PARCHMENT_LIGHT
      g.fillCircle(16, 16, 8);
      g.lineStyle(1.5, 0x2a1a0a, 1);  // INK_DARK
      g.strokeCircle(16, 16, 8);
      g.generateTexture('city', 32, 32);
      g.destroy();
    }

    // Bonus city — same + gold badge indicator
    if (!this.textures.exists('city_bonus')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xf5f0d8, 1);
      g.fillCircle(16, 16, 8);
      g.lineStyle(2, 0xc8a96e, 1);  // PARCHMENT_DARK border
      g.strokeCircle(16, 16, 8);
      // Small badge circle upper-right
      g.fillStyle(0xc8a96e, 1);
      g.fillCircle(23, 9, 5);
      g.lineStyle(1, 0x2a1a0a, 1);
      g.strokeCircle(23, 9, 5);
      g.generateTexture('city_bonus', 32, 32);
      g.destroy();
    }

    // Pickup city — slight fill variation
    if (!this.textures.exists('city_pickup')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xe8dfc0, 1);  // PARCHMENT_MID fill
      g.fillCircle(16, 16, 8);
      g.lineStyle(1.5, 0x2a1a0a, 1);
      g.strokeCircle(16, 16, 8);
      g.generateTexture('city_pickup', 32, 32);
      g.destroy();
    }

    // Spy marker — green diamond kite (player)
    if (!this.textures.exists('spy_marker')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0x4db84e, 1);   // SPY_GREEN
      g.lineStyle(2, 0x3a9a3a, 1); // SPY_GREEN_DARK
      g.beginPath();
      g.moveTo(14, 2);   // top point
      g.lineTo(26, 14);  // right point
      g.lineTo(14, 34);  // bottom point (map pin tip)
      g.lineTo(2, 14);   // left point
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.generateTexture('spy_marker', 28, 36);
      g.destroy();
    }

    // Opponent marker — red diamond kite
    if (!this.textures.exists('opponent_marker')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xcc3322, 1);   // TARGET_RED
      g.lineStyle(2, 0x9a2010, 1); // TARGET_RED_DARK
      g.beginPath();
      g.moveTo(14, 2);
      g.lineTo(26, 14);
      g.lineTo(14, 34);
      g.lineTo(2, 14);
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.generateTexture('opponent_marker', 28, 36);
      g.destroy();
    }

    // City highlight — red ring for adjacent cities
    if (!this.textures.exists('city_highlight')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(0xcc3322, 0.12);
      g.fillCircle(20, 20, 18);
      g.lineStyle(2, 0xcc3322, 0.8);
      g.strokeCircle(20, 20, 18);
      g.generateTexture('city_highlight', 40, 40);
      g.destroy();
    }

    // ── Action button icons (32×32, dark ink on transparent) ─────
    const INK = 0x2a1a0a;

    // btn_control — bullseye / target
    if (!this.textures.exists('btn_control')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.lineStyle(1.5, INK, 1);
      g.strokeCircle(16, 16, 12);
      g.strokeCircle(16, 16, 7);
      g.fillStyle(INK, 1);
      g.fillCircle(16, 16, 2.5);
      g.lineBetween(16, 3, 16, 8);
      g.lineBetween(16, 24, 16, 29);
      g.lineBetween(3, 16, 8, 16);
      g.lineBetween(24, 16, 29, 16);
      g.generateTexture('btn_control', 32, 32);
      g.destroy();
    }

    // btn_strike — dagger pointing down
    if (!this.textures.exists('btn_strike')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(INK, 1);
      // blade (triangle pointing down)
      g.fillTriangle(16, 28, 12, 10, 20, 10);
      // crossguard
      g.fillRect(7, 9, 18, 3);
      // handle
      g.fillRoundedRect(13, 3, 6, 7, 2);
      g.generateTexture('btn_strike', 32, 32);
      g.destroy();
    }

    // btn_wait — hourglass
    if (!this.textures.exists('btn_wait')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(INK, 0.9);
      // outer frame lines
      g.lineStyle(2, INK, 1);
      g.lineBetween(7, 4, 25, 4);
      g.lineBetween(7, 28, 25, 28);
      // upper triangle (full, emptying)
      g.fillTriangle(7, 4, 25, 4, 16, 16);
      // lower triangle (accumulating)
      g.fillTriangle(7, 28, 25, 28, 16, 16);
      g.generateTexture('btn_wait', 32, 32);
      g.destroy();
    }

    // btn_go_deep — spy hat (fedora)
    if (!this.textures.exists('btn_go_deep')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(INK, 0.9);
      // hat body
      g.fillRoundedRect(10, 7, 12, 13, 3);
      // hat brim
      g.fillEllipse(16, 20, 22, 7);
      g.generateTexture('btn_go_deep', 32, 32);
      g.destroy();
    }

    // btn_locate — magnifying glass
    if (!this.textures.exists('btn_locate')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.lineStyle(2.5, INK, 1);
      g.strokeCircle(13, 13, 9);
      g.lineStyle(3.5, INK, 1);
      g.lineBetween(20, 20, 28, 28);
      g.generateTexture('btn_locate', 32, 32);
      g.destroy();
    }

    // btn_prep — open book / scroll
    if (!this.textures.exists('btn_prep')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(INK, 0.85);
      // left page
      g.fillRoundedRect(4, 6, 11, 20, 1);
      // right page
      g.fillRoundedRect(17, 6, 11, 20, 1);
      // spine gap (lighter)
      g.fillStyle(0xe8dfc0, 1);
      g.fillRect(14, 6, 4, 20);
      // page lines on left
      g.fillStyle(0xe8dfc0, 1);
      g.fillRect(6, 10, 7, 1);
      g.fillRect(6, 13, 7, 1);
      g.fillRect(6, 16, 7, 1);
      g.fillRect(6, 19, 5, 1);
      // page lines on right
      g.fillRect(19, 10, 7, 1);
      g.fillRect(19, 13, 7, 1);
      g.fillRect(19, 16, 7, 1);
      g.fillRect(19, 19, 5, 1);
      g.generateTexture('btn_prep', 32, 32);
      g.destroy();
    }

    // btn_unlock — closed padlock (locked ability slot)
    if (!this.textures.exists('btn_unlock')) {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      // padlock body
      g.fillStyle(INK, 0.85);
      g.fillRoundedRect(8, 16, 16, 14, 3);
      // keyhole
      g.fillStyle(0xe8dfc0, 1);
      g.fillCircle(16, 22, 2.5);
      g.fillRect(15, 23, 2, 4);
      // shackle (U-shape): draw as two verticals + curved top
      g.lineStyle(2.5, INK, 1);
      g.lineBetween(11, 16, 11, 10);
      g.lineBetween(21, 16, 21, 10);
      // arc across the top (approximated with line segments)
      g.lineStyle(2.5, INK, 1);
      g.beginPath();
      g.moveTo(11, 10);
      g.lineTo(12, 7);
      g.lineTo(16, 5);
      g.lineTo(20, 7);
      g.lineTo(21, 10);
      g.strokePath();
      g.generateTexture('btn_unlock', 32, 32);
      g.destroy();
    }
  }
}
