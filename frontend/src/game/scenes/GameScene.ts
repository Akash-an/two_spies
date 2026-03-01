import Phaser from 'phaser';
import { BoardRenderer } from '../entities/BoardRenderer';
import {
  ActionKind,
  AbilityId,
  ClientMessageType,
  MatchState,
  PlayerSide,
  ServerMessageType,
} from '../../types/Messages';
import type { INetworkClient } from '../../network/NetworkClient';

/**
 * GameScene — main gameplay scene.
 *
 * Renders the city-graph board via BoardRenderer and provides an action
 * bar (Move / Strike / End Turn).  All networking goes through the
 * network client stored in the Phaser registry.
 */
export class GameScene extends Phaser.Scene {
  private board!: BoardRenderer;
  private net!: INetworkClient;
  private state!: MatchState;

  // HUD elements
  private turnText!: Phaser.GameObjects.Text;
  private intelText!: Phaser.GameObjects.Text;
  private actionsText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private cityText!: Phaser.GameObjects.Text;
  private coverText!: Phaser.GameObjects.Text;
  private playerNameText!: Phaser.GameObjects.Text;
  private opponentNameText!: Phaser.GameObjects.Text;
  private tooltipText!: Phaser.GameObjects.Text;

  // Current selected action mode
  private actionMode: 'MOVE' | 'STRIKE' | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    console.log('[GameScene] create() called');
    this.cameras.main.setBackgroundColor('#0f0f23');
    this.net = this.registry.get('network') as INetworkClient;

    // ── Listen for state updates ─────────────────────────────────
    this.net.on(ServerMessageType.MATCH_STATE, (_msg: unknown) => {
      const msg = _msg as { payload: MatchState };
      console.log('[GameScene] MATCH_STATE received via network listener');
      this.state = msg.payload;
      this.onStateUpdate();
    });

    // Also listen for state updates via game events (from App.tsx)
    this.game.events.on('match-state-updated', (state: MatchState) => {
      console.log('[GameScene] MATCH_STATE received via game events');
      this.state = state;
      this.onStateUpdate();
    });

    this.net.on(ServerMessageType.ERROR, (_msg: unknown) => {
      const msg = _msg as { payload: { message: string } };
      this.showStatus(msg.payload.message, '#ff6666');
    });

    this.net.on(ServerMessageType.GAME_OVER, (_msg: unknown) => {
      const msg = _msg as { payload: { winner: PlayerSide; reason: string } };
      this.showGameOverBanner(msg.payload.winner, msg.payload.reason);
    });

    // ── HUD ──────────────────────────────────────────────────────
    this.createHUD();

    // ── Check for existing state in registry (arrived before scene started) ──
    const existingState = this.registry.get('latestMatchState') as MatchState | undefined;
    if (existingState) {
      console.log('[GameScene] Found existing state in registry, processing it now');
      this.state = existingState;
      this.onStateUpdate();
    } else {
      console.log('[GameScene] No existing state found, waiting for MATCH_STATE');
    }

    // ── Input: click on city ─────────────────────────────────────
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.board || !this.state || !this.actionMode) return;
      const cityId = this.board.getCityAtPointer(pointer);
      if (!cityId) return;

      if (this.actionMode === 'MOVE') {
        this.net.send(ClientMessageType.PLAYER_ACTION, {
          action: ActionKind.MOVE,
          targetCity: cityId,
        });
        this.actionMode = null;
        this.updateActionButtons();
      }
    });

    this.game.events.emit('scene-ready', 'GameScene');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(_time: number, _delta: number): void {
    // future: animations, interpolation
  }

  // ── HUD construction ────────────────────────────────────────────

  private createHUD(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const hud = { fontFamily: 'monospace', fontSize: '14px', color: '#cccce0' } as const;
    const hudSmall = { fontFamily: 'monospace', fontSize: '12px', color: '#8888aa' } as const;
    const hudPlayerName = { fontFamily: 'monospace', fontSize: '16px', color: '#e0c872' } as const;

    // Top-left info block
    this.turnText = this.add.text(16, 12, '', hud).setDepth(20);
    this.actionsText = this.add.text(16, 32, '', hud).setDepth(20);
    this.intelText = this.add.text(16, 52, '', hud).setDepth(20);
    this.coverText = this.add.text(16, 72, '', hudSmall).setDepth(20);
    this.cityText = this.add.text(16, 92, '', hudSmall).setDepth(20);

    // Top-right player & opponent names (increased padding from 16 to 40 to prevent cutoff)
    this.playerNameText = this.add.text(w - 40, 12, '', hudPlayerName).setOrigin(1, 0).setDepth(20);
    this.opponentNameText = this.add.text(w - 40, 34, '', hudSmall).setOrigin(1, 0).setDepth(20);

    // Status bar (centre bottom) - made more prominent
    this.statusText = this.add
      .text(w / 2, h - 16, '', { fontFamily: 'monospace', fontSize: '16px', color: '#e0c872', fontStyle: 'bold' })
      .setOrigin(0.5, 1)
      .setDepth(20);

    // ── City Type Legend (bottom-left) ──────────────────────────
    this.createCityLegend();

    // ── Tooltip (hidden by default, shown on hover) ─────────────
    this.tooltipText = this.add
      .text(0, 0, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#1a1a2e',
        padding: { x: 8, y: 6 },
      })
      .setDepth(100)
      .setVisible(false);

    // ── Action buttons ───────────────────────────────────────────
    this.createActionButtons();
  }

  private createCityLegend(): void {
    const h = this.cameras.main.height;
    const legendX = 16;
    const legendY = h - 90;
    const legendStyle = { fontFamily: 'monospace', fontSize: '11px', color: '#8888aa' } as const;
    
    // Title
    this.add.text(legendX, legendY, 'City Types:', { ...legendStyle, color: '#aaaacc' }).setDepth(20);
    
    // Normal city (white border)
    const normalCircle = this.add.graphics().setDepth(20);
    normalCircle.lineStyle(2, 0xffffff, 0.8);
    normalCircle.strokeCircle(legendX + 8, legendY + 22, 6);
    this.add.text(legendX + 20, legendY + 16, 'Normal', legendStyle).setDepth(20);
    
    // Bonus city (gold border)
    const bonusCircle = this.add.graphics().setDepth(20);
    bonusCircle.lineStyle(2, 0xe0c872, 1);
    bonusCircle.strokeCircle(legendX + 8, legendY + 40, 6);
    this.add.text(legendX + 20, legendY + 34, 'Bonus (+Intel)', legendStyle).setDepth(20);
    
    // Pickup city (green border)
    const pickupCircle = this.add.graphics().setDepth(20);
    pickupCircle.lineStyle(2, 0x66cc88, 1);
    pickupCircle.strokeCircle(legendX + 8, legendY + 58, 6);
    this.add.text(legendX + 20, legendY + 52, 'Pickup (+Action)', legendStyle).setDepth(20);
  }

  private moveBtn!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone };
  private strikeBtn!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone };
  private locateBtn!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone };
  private waitBtn!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone };
  private createActionButtons(): void {
    const h = this.cameras.main.height;
    const w = this.cameras.main.width;
    const btnW = 100;
    const btnH = 38;
    const gap = 12;
    const totalW = btnW * 4 + gap * 3;  // 4 buttons now (removed End Turn)
    const startX = w / 2 - totalW / 2 + btnW / 2;
    const btnY = h - 54;

    this.moveBtn = this.makeButton(startX, btnY, btnW, btnH, 'MOVE', () => {
      if (!this.areButtonsEnabled()) {
        this.showStatus('Not your turn', '#666688');
        return;
      }
      this.actionMode = this.actionMode === 'MOVE' ? null : 'MOVE';
      this.updateActionButtons();
      this.showStatus(this.actionMode === 'MOVE' ? 'Click an adjacent city to move' : '', '#88ccff');
    });

    this.strikeBtn = this.makeButton(startX + (btnW + gap), btnY, btnW, btnH, 'STRIKE', () => {
      if (!this.areButtonsEnabled()) {
        this.showStatus('Not your turn', '#666688');
        return;
      }
      // Strike at current location immediately (no city selection needed)
      if (!this.state) return;
      this.net.send(ClientMessageType.PLAYER_ACTION, {
        action: ActionKind.STRIKE,
        targetCity: this.state.player.currentCity,
      });
      this.showStatus('Strike attempted at current location!', '#ff6666');
    });

    this.locateBtn = this.makeButton(startX + (btnW + gap) * 2, btnY, btnW, btnH, 'LOCATE', () => {
      if (!this.areButtonsEnabled()) {
        this.showStatus('Not your turn', '#666688');
        return;
      }
      // Use LOCATE ability to reveal opponent position
      this.net.send(ClientMessageType.PLAYER_ACTION, {
        action: ActionKind.ABILITY,
        abilityId: AbilityId.LOCATE,
      });
      this.showStatus('Using Locate ability...', '#88ccff');
    });

    this.waitBtn = this.makeButton(startX + (btnW + gap) * 3, btnY, btnW, btnH, 'WAIT', () => {
      if (!this.areButtonsEnabled()) {
        this.showStatus('Not your turn', '#666688');
        return;
      }
      // Wait action - consumes action point without doing anything
      this.net.send(ClientMessageType.PLAYER_ACTION, {
        action: ActionKind.WAIT,
      });
      this.showStatus('Waiting...', '#8888aa');
    });
  }

  /** Check if buttons should be enabled (player's turn and not game over) */
  private areButtonsEnabled(): boolean {
    if (!this.state) return false;
    const isMyTurn = this.state.currentTurn === this.state.player.side;
    return isMyTurn && !this.state.gameOver;
  }

  private makeButton(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
  ) {
    const bg = this.add.graphics().setDepth(20);
    this.drawBtn(bg, x, y, w, h, false, false);

    const label = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '13px', color: '#e0c872' })
      .setOrigin(0.5)
      .setDepth(21);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(22);
    zone.on('pointerdown', onClick);
    // Store hover state for dynamic redraw
    let isHovering = false;
    zone.on('pointerover', () => {
      isHovering = true;
      // Will be redrawn by updateActionButtons if needed, or immediately if not active
      this.updateActionButtons();
    });
    zone.on('pointerout', () => {
      isHovering = false;
      this.updateActionButtons();
    });
    // Store hover state on the button object for later reference
    (zone as any).isHovering = () => isHovering;

    return { bg, label, zone };
  }

  private drawBtn(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, hover: boolean, active: boolean): void {
    gfx.clear();
    
    // Check if buttons should be disabled
    const disabled = !this.areButtonsEnabled();
    
    // Determine background color based on state
    let fillColor: number;
    let borderAlpha: number;
    let borderColor: number = 0xe0c872; // default gold
    
    if (disabled) {
      fillColor = 0x1a1a2a; // Very dark when disabled
      borderAlpha = 0.3;
      borderColor = 0x444455; // Dark grey border
    } else if (active) {
      fillColor = hover ? 0x6a7a4a : 0x4a5a3a; // Green-tinted when active (brighter on hover)
      borderAlpha = 1.0; // Full opacity border when active
    } else if (hover) {
      fillColor = 0x445577; // Blue-grey hover
      borderAlpha = 0.7;
    } else {
      fillColor = 0x222244; // Dark normal state
      borderAlpha = 0.7;
    }
    
    gfx.fillStyle(fillColor, 1);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    gfx.lineStyle(1, borderColor, borderAlpha);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
  }

  private updateActionButtons(): void {
    const disabled = !this.areButtonsEnabled();
    const updateBtn = (btn: typeof this.moveBtn, isActive: boolean) => {
      const isHovering = (btn.zone as any).isHovering ? (btn.zone as any).isHovering() : false;
      // Dim label color when disabled
      btn.label.setColor(disabled ? '#555566' : (isActive ? '#ffffff' : '#e0c872'));
      this.drawBtn(btn.bg, btn.zone.x, btn.zone.y, 100, 38, isHovering, isActive);
    };
    updateBtn(this.moveBtn, this.actionMode === 'MOVE');
    // Strike, Locate, Wait don't have active states (immediate actions)
    updateBtn(this.strikeBtn, false);
    updateBtn(this.locateBtn, false);
    updateBtn(this.waitBtn, false);
  }

  // ── State handling ──────────────────────────────────────────────

  private boardDrawn = false;

  private onStateUpdate(): void {
    if (!this.state) {
      console.warn('[GameScene] onStateUpdate called but state is null');
      return;
    }

    console.log('[GameScene] onStateUpdate - Turn:', this.state.turnNumber, 'BoardDrawn:', this.boardDrawn);

    if (!this.boardDrawn) {
      console.log('[GameScene] Drawing board for first time');
      this.board = new BoardRenderer(this);
      this.board.drawBoard(this.state.map, this.state);
      // Enable tooltips only if tooltip element exists
      if (this.tooltipText) {
        this.board.enableTooltips(this.tooltipText);
      } else {
        console.warn('[GameScene] tooltipText not available yet');
      }
      this.boardDrawn = true;
    } else {
      this.board.updateState(this.state);
    }

    // Update HUD
    const p = this.state.player;
    const isMyTurn = this.state.currentTurn === p.side;
    this.turnText.setText(
      `Turn ${this.state.turnNumber}  —  ${isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}`,
    );
    this.turnText.setColor(isMyTurn ? '#e0c872' : '#666688');
    this.actionsText.setText(`Actions: ${p.actionsRemaining} / 2`);
    this.intelText.setText(`Intel: ${p.intel}`);
    this.coverText.setText(`Cover: ${p.hasCover ? 'YES' : 'NO'}`);
    this.coverText.setColor(p.hasCover ? '#66cc88' : '#8888aa');
    this.cityText.setText(`Location: ${p.currentCity}`);
    // Use the server-provided name, falling back to registry (set pre-match) or side
    const displayName = p.name || this.registry.get('playerName') || p.side;
    console.log('[GameScene] Setting player name to:', displayName);
    this.playerNameText.setText(displayName);

    // Opponent name
    const oppName = this.state.opponentName || '???';
    console.log('[GameScene] Setting opponent name to:', oppName);
    this.opponentNameText.setText(`vs ${oppName}`);

    // Update button states (enable/disable based on turn)
    this.updateActionButtons();

    // Auto-end turn if no actions remaining
    if (isMyTurn && p.actionsRemaining === 0) {
      console.log('[GameScene] Auto-ending turn - no actions remaining');
      this.actionMode = null;
      this.showStatus('No actions remaining - ending turn automatically', '#ff8844');
      // Delay slightly so player can see the message
      this.time.delayedCall(800, () => {
        this.net.send(ClientMessageType.END_TURN, {});
      });
    } else {
      this.showStatus('', '#e0c872');
    }

    // Update opponent location marker
    this.updateOpponentMarker();
  }

  private showStatus(msg: string, color: string): void {
    this.statusText.setText(msg);
    this.statusText.setColor(color);
  }

  private showGameOverBanner(winner: PlayerSide, reason: string): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const isVictory = winner === this.state?.player.side;

    // Semi-transparent dark overlay
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);
    overlay.setDepth(1000);

    // Banner background
    const bannerW = 600;
    const bannerH = 280;
    const bannerBg = this.add.rectangle(w / 2, h / 2, bannerW, bannerH, 0x1a1a2e);
    bannerBg.setDepth(1001);
    bannerBg.setStrokeStyle(4, isVictory ? 0x4ecdc4 : 0xff6b6b);

    // Main text: VICTORY! or DEFEAT!
    const mainText = isVictory ? 'VICTORY!' : 'DEFEAT!';
    const mainColor = isVictory ? '#4ecdc4' : '#ff6b6b';
    const title = this.add.text(w / 2, h / 2 - 60, mainText, {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: mainColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);
    title.setDepth(1002);

    // Winner subtitle
    const winnerText = this.add.text(w / 2, h / 2 + 10, `${winner} wins`, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#e0c872',
    });
    winnerText.setOrigin(0.5);
    winnerText.setDepth(1002);

    // Reason text
    const reasonText = this.add.text(w / 2, h / 2 + 60, reason, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#aaaacc',
      align: 'center',
      wordWrap: { width: bannerW - 40 },
    });
    reasonText.setOrigin(0.5);
    reasonText.setDepth(1002);

    // Optional: Add a subtle pulse animation to the title
    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updateOpponentMarker(): void {
    if (!this.board || !this.state) return;
    
    // Show opponent location if known (backend clears it after opponent's action)
    this.board.updateOpponentLocation(this.state.player.knownOpponentCity);
  }
}
