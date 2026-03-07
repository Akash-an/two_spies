import Phaser from 'phaser';

/**
 * TimerDisplay — renders a turn timer on the left-center of the screen.
 *
 * Shows:
 * - Seconds remaining (large text)
 * - Color changes at 10 seconds (warning state)
 * - Optional warning message at 5 seconds remaining
 */
export class TimerDisplay {
  private scene: Phaser.Scene;
  private timerText!: Phaser.GameObjects.Text;
  private warningText!: Phaser.GameObjects.Text;
  private timerBackground!: Phaser.GameObjects.Graphics;
  private isWarning = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.create();
  }

  private create(): void {
    const h = this.scene.cameras.main.height;

    // Position: left-center, with some padding
    const timerX = 60;
    const timerY = h / 2;

    // Background circle/box
    this.timerBackground = this.scene.add.graphics().setDepth(19);
    this.updateBackground(timerX, timerY);

    // Main timer text (large, centered)
    this.timerText = this.scene.add
      .text(timerX, timerY, '15', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#66cc88',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20);

    // Warning text (appears below main text at 5 seconds)
    this.warningText = this.scene.add
      .text(timerX, timerY + 50, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff6666',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(20)
      .setVisible(false);
  }

  /**
   * Update the timer display based on elapsed time and turn duration.
   * @param elapsedMs Time elapsed since turn started (ms)
   * @param durationMs Total turn duration (ms) - default 15000
   */
  update(elapsedMs: number, durationMs: number = 15000): void {
    const secondsRemaining = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));

    // Update main text
    this.timerText.setText(secondsRemaining.toString());

    // Check warning threshold (10 seconds remaining = 5 seconds into warning)
    const isNowWarning = secondsRemaining <= 10;

    // Transition to warning color
    if (isNowWarning && !this.isWarning) {
      this.timerText.setColor('#ff9933');
      this.isWarning = true;
    } else if (!isNowWarning && this.isWarning) {
      this.timerText.setColor('#66cc88');
      this.isWarning = false;
    }

    // Show warning message at 5 seconds
    if (secondsRemaining <= 5 && secondsRemaining > 0) {
      this.warningText.setText('⚠ TIME RUNNING');
      this.warningText.setVisible(true);
    } else if (secondsRemaining === 0) {
      this.warningText.setText('TIME UP!');
      this.warningText.setVisible(true);
      this.warningText.setColor('#ff3333');
    } else {
      this.warningText.setVisible(false);
    }
  }

  /**
   * Reset the timer to initial state (15 seconds, green color).
   */
  reset(): void {
    this.timerText.setText('15');
    this.timerText.setColor('#66cc88');
    this.warningText.setVisible(false);
    this.isWarning = false;
  }

  /**
   * Set visibility of timer display.
   */
  setVisible(visible: boolean): void {
    this.timerText.setVisible(visible);
    this.warningText.setVisible(visible && this.warningText.text !== '');
    this.timerBackground.setVisible(visible);
  }

  /**
   * Destroy timer display objects.
   */
  destroy(): void {
    this.timerText.destroy();
    this.warningText.destroy();
    this.timerBackground.destroy();
  }

  private updateBackground(x: number, y: number): void {
    this.timerBackground.clear();
    this.timerBackground.lineStyle(2, 0x4488bb, 0.6);
    this.timerBackground.strokeCircle(x, y, 45);
  }
}
