import Phaser from 'phaser';
import { BoardRenderer } from '../entities/BoardRenderer';
import {
  ActionKind,
  ClientMessageType,
  MatchState,
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

  // Current selected action mode
  private actionMode: 'MOVE' | 'STRIKE' | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0f0f23');
    this.net = this.registry.get('network') as INetworkClient;

    // ── Listen for state updates ─────────────────────────────────
    this.net.on(ServerMessageType.MATCH_STATE, (_msg: unknown) => {
      const msg = _msg as { payload: MatchState };
      this.state = msg.payload;
      this.onStateUpdate();
    });

    this.net.on(ServerMessageType.ERROR, (_msg: unknown) => {
      const msg = _msg as { payload: { message: string } };
      this.showStatus(msg.payload.message, '#ff6666');
    });

    this.net.on(ServerMessageType.GAME_OVER, (_msg: unknown) => {
      const msg = _msg as { payload: { winner: string } };
      this.showStatus(`Game Over — ${msg.payload.winner} wins!`, '#e0c872');
    });

    // ── HUD ──────────────────────────────────────────────────────
    this.createHUD();

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
      } else if (this.actionMode === 'STRIKE') {
        this.net.send(ClientMessageType.PLAYER_ACTION, {
          action: ActionKind.STRIKE,
          targetCity: cityId,
        });
      }

      this.actionMode = null;
      this.updateActionButtons();
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

    // Top-left info block
    this.turnText = this.add.text(16, 12, '', hud).setDepth(20);
    this.actionsText = this.add.text(16, 32, '', hud).setDepth(20);
    this.intelText = this.add.text(16, 52, '', hud).setDepth(20);
    this.coverText = this.add.text(16, 72, '', hudSmall).setDepth(20);
    this.cityText = this.add.text(16, 92, '', hudSmall).setDepth(20);

    // Top-right player & opponent names
    this.playerNameText = this.add.text(w - 16, 12, '', hud).setOrigin(1, 0).setDepth(20);
    this.opponentNameText = this.add.text(w - 16, 32, '', hudSmall).setOrigin(1, 0).setDepth(20);

    // Status bar (centre bottom)
    this.statusText = this.add
      .text(w / 2, h - 16, '', { fontFamily: 'monospace', fontSize: '13px', color: '#8888aa' })
      .setOrigin(0.5, 1)
      .setDepth(20);

    // ── Action buttons ───────────────────────────────────────────
    this.createActionButtons();
  }

  private moveBtn!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone };
  private strikeBtn!: { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; zone: Phaser.GameObjects.Zone };
  private createActionButtons(): void {
    const h = this.cameras.main.height;
    const w = this.cameras.main.width;
    const btnW = 120;
    const btnH = 38;
    const gap = 16;
    const totalW = btnW * 3 + gap * 2;
    const startX = w / 2 - totalW / 2 + btnW / 2;
    const btnY = h - 54;

    this.moveBtn = this.makeButton(startX, btnY, btnW, btnH, 'MOVE', () => {
      this.actionMode = this.actionMode === 'MOVE' ? null : 'MOVE';
      this.updateActionButtons();
      this.showStatus(this.actionMode === 'MOVE' ? 'Click an adjacent city to move' : '', '#88ccff');
    });

    this.strikeBtn = this.makeButton(startX + btnW + gap, btnY, btnW, btnH, 'STRIKE', () => {
      this.actionMode = this.actionMode === 'STRIKE' ? null : 'STRIKE';
      this.updateActionButtons();
      this.showStatus(this.actionMode === 'STRIKE' ? 'Click a city to strike' : '', '#ff6666');
    });

    this.makeButton(startX + (btnW + gap) * 2, btnY, btnW, btnH, 'END TURN', () => {
      this.actionMode = null;
      this.updateActionButtons();
      this.net.send(ClientMessageType.END_TURN, {});
    });
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
    this.drawBtn(bg, x, y, w, h, false);

    const label = this.add
      .text(x, y, text, { fontFamily: 'monospace', fontSize: '13px', color: '#e0c872' })
      .setOrigin(0.5)
      .setDepth(21);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(22);
    zone.on('pointerdown', onClick);
    zone.on('pointerover', () => this.drawBtn(bg, x, y, w, h, true));
    zone.on('pointerout', () => this.drawBtn(bg, x, y, w, h, false));

    return { bg, label, zone };
  }

  private drawBtn(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, hover: boolean): void {
    gfx.clear();
    gfx.fillStyle(hover ? 0x445577 : 0x222244, 1);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    gfx.lineStyle(1, 0xe0c872, 0.7);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
  }

  private updateActionButtons(): void {
    const active = (btn: typeof this.moveBtn, isActive: boolean) => {
      btn.label.setColor(isActive ? '#ffffff' : '#e0c872');
      this.drawBtn(btn.bg, btn.zone.x, btn.zone.y, 120, 38, isActive);
    };
    active(this.moveBtn, this.actionMode === 'MOVE');
    active(this.strikeBtn, this.actionMode === 'STRIKE');
  }

  // ── State handling ──────────────────────────────────────────────

  private boardDrawn = false;

  private onStateUpdate(): void {
    if (!this.state) return;

    if (!this.boardDrawn) {
      this.board = new BoardRenderer(this);
      this.board.drawBoard(this.state.map, this.state);
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
    this.playerNameText.setText(displayName);

    // Opponent name
    const oppName = this.state.opponentName || '???';
    this.opponentNameText.setText(`vs ${oppName}`);

    if (!isMyTurn) {
      this.showStatus("Waiting for opponent…", '#666688');
    } else {
      this.showStatus('', '#8888aa');
    }
  }

  private showStatus(msg: string, color: string): void {
    this.statusText.setText(msg);
    this.statusText.setColor(color);
  }
}
