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
    this.cameras.main.setBackgroundColor('#0f0f23');

    // ── Title ────────────────────────────────────────────────────
    this.add
      .text(width / 2, height * 0.25, 'TWO SPIES', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#e0c872',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.25 + 52, 'a game of espionage', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8888aa',
      })
      .setOrigin(0.5);

    // ── Listen for MATCH_START from network layer ────────────────
    // The React overlay sends JOIN_MATCH; the server replies with
    // MATCH_START once both players are in.  We transition to GameScene.
    const net = this.registry.get('network');
    if (net) {
      net.on('MATCH_START', () => {
        this.scene.start('GameScene');
      });
    }

    this.game.events.emit('scene-ready', 'LobbyScene');
  }
}
