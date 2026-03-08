import Phaser from 'phaser';

/**
 * LobbyScene — visual backdrop shown while the React overlay handles
 * name entry and matchmaking.
 *
 * This scene does NOT contain interactive buttons.  The React layer sends
 * SET_PLAYER_NAME + JOIN_MATCH when the player submits their codename,
 * and the App component listens for MATCH_START to transition us to
 * GameScene.  This scene only needs to show thematic visuals and listen
 * for the transition signal.
 */
export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#6db5ae');  // OCEAN_TEAL

    // ── Map background ───────────────────────────────────────────
    if (this.textures.exists('europe_map')) {
      this.add.image(width / 2, height / 2, 'europe_map').setDepth(0);
    }

    // ── Title ────────────────────────────────────────────────────
    this.add
      .text(width / 2, height * 0.25, 'TWO SPIES', {
        fontFamily: "'Georgia', serif",
        fontSize: '48px',
        color: '#2a1a0a',  // INK_DARK
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.25 + 54, 'a game of espionage', {
        fontFamily: "'Georgia', serif",
        fontSize: '16px',
        color: '#5a3a1a',  // INK_MID
        fontStyle: 'italic',
      })
      .setOrigin(0.5);

    // ── Listen for MATCH_START from network layer ────────────────
    const net = this.registry.get('network');
    if (net) {
      net.on('MATCH_START', () => {
        this.scene.start('GameScene');
      });
    }

    this.game.events.emit('scene-ready', 'LobbyScene');
  }
}
