import Phaser from 'phaser';

/**
 * TimerDisplay — renders a turn timer inside the left sidebar.
 */
export class TimerDisplay {
  private scene: Phaser.Scene;
  private timerText!: Phaser.GameObjects.Text;
  private warningText!: Phaser.GameObjects.Text;
  private isWarning = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    // Positioned inside the sidebar (85px wide), vertically centered
    const timerX = 42;
    const timerY = this.scene.cameras.main.height / 2 - 20;

    this.timerText = this.scene.add
      .text(timerX, timerY, '15', {
        fontFamily: "'Georgia', serif",
        fontSize: '36px',
        color: '#2a1a0a',  // INK_DARK
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(25);

    this.warningText = this.scene.add
      .text(timerX, timerY + 40, '', {
        fontFamily: "'Georgia', serif",
        fontSize: '10px',
        color: '#c0392b',  // ACTIONS_RED
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(25)
      .setVisible(false);
  }

  update(elapsedMs: number, durationMs: number = 15000): void {
    const secondsRemaining = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
    this.timerText.setText(secondsRemaining.toString());

    const isNowWarning = secondsRemaining <= 10;
    if (isNowWarning && !this.isWarning) {
      this.timerText.setColor('#c0392b');  // ACTIONS_RED warning
      this.isWarning = true;
    } else if (!isNowWarning && this.isWarning) {
      this.timerText.setColor('#2a1a0a');  // INK_DARK normal
      this.isWarning = false;
    }

    if (secondsRemaining <= 5 && secondsRemaining > 0) {
      this.warningText.setText('TIME!');
      this.warningText.setVisible(true);
    } else if (secondsRemaining === 0) {
      this.warningText.setText('UP!');
      this.warningText.setColor('#c0392b');
      this.warningText.setVisible(true);
    } else {
      this.warningText.setVisible(false);
    }
  }

  reset(): void {
    this.timerText.setText('15');
    this.timerText.setColor('#2a1a0a');
    this.warningText.setVisible(false);
    this.isWarning = false;
  }

  setVisible(visible: boolean): void {
    this.timerText.setVisible(visible);
    this.warningText.setVisible(visible && this.warningText.text !== '');
  }

  destroy(): void {
    this.timerText.destroy();
    this.warningText.destroy();
  }
}
