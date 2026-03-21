import Phaser from 'phaser';
import { BoardRenderer } from '../entities/BoardRenderer';
import { TimerDisplay } from '../entities/TimerDisplay';
import {
  ActionKind,
  AbilityId,
  ClientMessageType,
  MatchState,
  PlayerSide,
  ServerMessageType,
} from '../../types/Messages';
import type { INetworkClient } from '../../network/NetworkClient';

// ── Layout constants ──────────────────────────────────────────────
const SIDEBAR_W    = 130;
const ACTION_BAR_H = 82;
const RIGHT_PANEL_W = 65;

// ── Palette ───────────────────────────────────────────────────────
const C_PARCHMENT_LIGHT = 0xf5f0d8;
const C_PARCHMENT_MID   = 0xe8dfc0;
const C_PARCHMENT_DARK  = 0xc8a96e;
const C_INK_DARK        = 0x2a1a0a;
const C_PANEL_HEADER    = 0x3d2010;
const C_ACTIONS_RED     = 0xc0392b;
const C_BUTTON_ACTIVE   = 0x3d2010;
const C_BUTTON_DISABLED = 0xb0a888;
const C_BANNER_RED      = 0xc0392b;
const C_BANNER_GREEN    = 0x4db84e;
const C_STAMP_BLUE      = 0x2a5a8a;
const C_TARGET_RED      = 0xcc3322;

const INK_DARK_STR  = '#2a1a0a';
const INK_MID_STR   = '#5a3a1a';
const WHITE_STR     = '#ffffff';
const FONT_SERIF    = "'Georgia', serif";

/**
 * GameScene — main gameplay scene.
 *
 * Renders the city-graph board via BoardRenderer and provides an action
 * bar (Control / Strike / Locate / Wait).  All networking goes through the
 * network client stored in the Phaser registry.
 */
export class GameScene extends Phaser.Scene {
  private board!: BoardRenderer;
  private net!: INetworkClient;
  private state!: MatchState;
  private timerDisplay!: TimerDisplay;

  // Sidebar HUD elements
  private playerRoleText!: Phaser.GameObjects.Text;
  private boltIconText!: Phaser.GameObjects.Text;   // action bolt icons in header
  private turnText!: Phaser.GameObjects.Text;
  private cityText!: Phaser.GameObjects.Text;
  private coverText!: Phaser.GameObjects.Text;
  private actionsTileValue!: Phaser.GameObjects.Text;
  private intelTileValue!: Phaser.GameObjects.Text;

  // Top-right names
  private playerNameText!: Phaser.GameObjects.Text;
  private opponentNameText!: Phaser.GameObjects.Text;

  // Status text (above action bar)
  private statusText!: Phaser.GameObjects.Text;

  // Tooltip
  private tooltipText!: Phaser.GameObjects.Text;

  // Action mode
  private actionMode: 'MOVE' | 'STRIKE' | null = null;

  // Action buttons — 9 total
  private actionBtns: Array<{
    bg: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    zone: Phaser.GameObjects.Zone;
    icon: Phaser.GameObjects.Image | null;
    forceDisabled: boolean;
  }> = [];

  // Banner de-dup tracking
  private lastStrikeBannerTurn = -1;
  private lastLocateBannerTurn = -1;
  private lastTurnOwner: string | null = null;

  // Active notification banner objects
  private activeBannerObjects: Phaser.GameObjects.GameObject[] = [];

  // Timer interpolation
  private lastServerElapsedMs = 0;
  private lastStateUpdateTime = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    console.log('[GameScene] create() called');
    this.cameras.main.setBackgroundColor('#6db5ae');  // OCEAN_TEAL
    this.net = this.registry.get('network') as INetworkClient;

    // ── Europe map background ────────────────────────────────────
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    if (this.textures.exists('europe_map')) {
      this.add.image(w / 2, h / 2, 'europe_map').setDepth(0);
    }

    // ── Right parchment strip ────────────────────────────────────
    const rStrip = this.add.graphics().setDepth(1);
    rStrip.fillStyle(0xe8dfc0, 1);  // PARCHMENT_MID
    rStrip.fillRect(w - RIGHT_PANEL_W, 0, RIGHT_PANEL_W, h);
    rStrip.lineStyle(1, 0xc8a96e, 1);
    rStrip.lineBetween(w - RIGHT_PANEL_W, 0, w - RIGHT_PANEL_W, h);

    this.game.events.on('match-state-updated', (state: MatchState) => {
      console.log('[GameScene] MATCH_STATE received via game events');
      this.state = state;
      this.onStateUpdate();
    });

    this.net.on(ServerMessageType.ERROR, (_msg: unknown) => {
      const msg = _msg as { payload: { message: string } };
      this.showStatus(msg.payload.message, '#c0392b');
    });

    this.net.on(ServerMessageType.GAME_OVER, (_msg: unknown) => {
      const msg = _msg as { payload: { winner: PlayerSide; reason: string } };
      this.showGameOverModal(msg.payload.winner, msg.payload.reason);
    });

    this.createHUD();

    const existingState = this.registry.get('latestMatchState') as MatchState | undefined;
    if (existingState) {
      this.state = existingState;
      this.onStateUpdate();
    }

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

  update(_time: number, _delta: number): void {
    if (this.state && this.timerDisplay) {
      const isMyTurn = this.state.currentTurn === this.state.player.side;
      if (isMyTurn) {
        const timeSinceUpdate = Date.now() - this.lastStateUpdateTime;
        const elapsed = this.lastServerElapsedMs + timeSinceUpdate;
        this.timerDisplay.update(elapsed, this.state.turnDuration || 15000);
        this.timerDisplay.setVisible(true);
      } else {
        this.timerDisplay.setVisible(false);
      }
    }
  }

  // ── HUD construction ────────────────────────────────────────────

  private createHUD(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.createSidebar(h);
    this.createActionBar(w, h);

    // Top-right player/opponent names
    this.playerNameText = this.add
      .text(w - RIGHT_PANEL_W / 2, 12, '', {
        fontFamily: FONT_SERIF,
        fontSize: '13px',
        color: INK_DARK_STR,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(25);

    this.opponentNameText = this.add
      .text(w - RIGHT_PANEL_W / 2, 30, '', {
        fontFamily: FONT_SERIF,
        fontSize: '11px',
        color: INK_MID_STR,
      })
      .setOrigin(0.5, 0)
      .setDepth(25);

    // Status text — just above action bar
    this.statusText = this.add
      .text(w / 2, h - ACTION_BAR_H - 8, '', {
        fontFamily: FONT_SERIF,
        fontSize: '13px',
        color: INK_MID_STR,
        fontStyle: 'italic',
      })
      .setOrigin(0.5, 1)
      .setDepth(25);

    // Tooltip
    this.tooltipText = this.add
      .text(0, 0, '', {
        fontFamily: FONT_SERIF,
        fontSize: '11px',
        color: INK_MID_STR,
        backgroundColor: '#f5f0d8',
        padding: { x: 6, y: 4 },
      })
      .setDepth(100)
      .setVisible(false);

    this.createActionButtons(w, h);
    this.timerDisplay = new TimerDisplay(this);
  }

  // ── Left Sidebar ─────────────────────────────────────────────────

  private createSidebar(h: number): void {
    // Parchment panel background
    const bg = this.add.graphics().setDepth(1);
    bg.fillStyle(C_PARCHMENT_MID, 1);
    bg.fillRect(0, 0, SIDEBAR_W, h);
    bg.lineStyle(1, C_PARCHMENT_DARK, 1);
    bg.lineBetween(SIDEBAR_W, 0, SIDEBAR_W, h);

    // Dark header
    const HEADER_H = 70;
    const header = this.add.graphics().setDepth(2);
    header.fillStyle(C_PANEL_HEADER, 1);
    header.fillRect(0, 0, SIDEBAR_W, HEADER_H);

    // Role label ("TARGET" or "SPY") — updated in onStateUpdate
    this.playerRoleText = this.add
      .text(SIDEBAR_W / 2, 10, '...', {
        fontFamily: FONT_SERIF,
        fontSize: '12px',
        color: WHITE_STR,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    // Bolt icons for actions remaining
    this.boltIconText = this.add
      .text(SIDEBAR_W / 2, 32, '', {
        fontFamily: FONT_SERIF,
        fontSize: '18px',
        color: '#f5f0d8',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    // Sidebar body HUD labels
    const bodyStyle = { fontFamily: FONT_SERIF, fontSize: '11px', color: INK_MID_STR } as const;
    const bodyBold  = { fontFamily: FONT_SERIF, fontSize: '11px', color: INK_DARK_STR, fontStyle: 'bold' } as const;

    this.add.text(8, HEADER_H + 12, 'TURN', bodyStyle).setDepth(3);
    this.turnText = this.add.text(8, HEADER_H + 24, '', bodyBold).setDepth(3);

    this.add.text(8, HEADER_H + 48, 'LOCATION', bodyStyle).setDepth(3);
    this.cityText = this.add.text(8, HEADER_H + 60, '', { ...bodyBold, fontSize: '10px' }).setDepth(3);

    this.add.text(8, HEADER_H + 84, 'COVER', bodyStyle).setDepth(3);
    this.coverText = this.add.text(8, HEADER_H + 96, '', bodyBold).setDepth(3);

    // ACTIONS tile (bottom)
    const TILE_H = 44;
    const tile1Y = h - ACTION_BAR_H - TILE_H * 2;
    const tile2Y = h - ACTION_BAR_H - TILE_H;

    const tilesBg = this.add.graphics().setDepth(2);
    tilesBg.fillStyle(C_ACTIONS_RED, 1);
    tilesBg.fillRect(0, tile1Y, SIDEBAR_W, TILE_H);
    tilesBg.fillRect(0, tile2Y, SIDEBAR_W, TILE_H);
    // Divider line
    tilesBg.lineStyle(1, C_PANEL_HEADER, 0.5);
    tilesBg.lineBetween(4, tile2Y, SIDEBAR_W - 4, tile2Y);

    this.add
      .text(SIDEBAR_W / 2, tile1Y + 4, 'ACTIONS', {
        fontFamily: FONT_SERIF,
        fontSize: '9px',
        color: '#f5f0d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.actionsTileValue = this.add
      .text(SIDEBAR_W / 2, tile1Y + 18, '', {
        fontFamily: FONT_SERIF,
        fontSize: '20px',
        color: WHITE_STR,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.add
      .text(SIDEBAR_W / 2, tile2Y + 4, 'INTEL', {
        fontFamily: FONT_SERIF,
        fontSize: '9px',
        color: '#f5f0d8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);

    this.intelTileValue = this.add
      .text(SIDEBAR_W / 2, tile2Y + 18, '', {
        fontFamily: FONT_SERIF,
        fontSize: '16px',
        color: WHITE_STR,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(3);
  }

  // ── Action Bar ───────────────────────────────────────────────────

  private createActionBar(w: number, h: number): void {
    const bar = this.add.graphics().setDepth(50);
    bar.fillStyle(C_PARCHMENT_LIGHT, 1);
    bar.fillRect(0, h - ACTION_BAR_H, w, ACTION_BAR_H);
    bar.lineStyle(1.5, C_PARCHMENT_DARK, 1);
    bar.lineBetween(0, h - ACTION_BAR_H, w, h - ACTION_BAR_H);
  }

  // ── Action Buttons ───────────────────────────────────────────────

  private createActionButtons(w: number, h: number): void {
    const btnW = 64;
    const btnH = 68;
    const gap  = 8;
    const totalW = btnW * 9 + gap * 8;
    const startX = (w - totalW) / 2 + btnW / 2;
    const btnY   = h - ACTION_BAR_H / 2;
    const x = (i: number) => startX + i * (btnW + gap);

    // 0: MOVE — move to adjacent city
    this.actionBtns[0] = this.makeButton(x(0), btnY, btnW, btnH, 'MOVE', 'btn_control', () => {
      if (!this.areButtonsEnabled()) { this.showStatus('Not your turn', INK_MID_STR); return; }
      this.actionMode = this.actionMode === 'MOVE' ? null : 'MOVE';
      this.updateActionButtons();
      this.showStatus(this.actionMode === 'MOVE' ? 'Click an adjacent city to move' : '', INK_MID_STR);
    });

    // 1: STRIKE
    this.actionBtns[1] = this.makeButton(x(1), btnY, btnW, btnH, 'STRIKE', 'btn_strike', () => {
      if (!this.areButtonsEnabled()) { this.showStatus('Not your turn', INK_MID_STR); return; }
      if (this.state?.isPlayerStranded) { this.showStatus('You must move out of the disappearing city!', '#c0392b'); return; }
      if (!this.state) return;
      this.net.send(ClientMessageType.PLAYER_ACTION, { action: ActionKind.STRIKE, targetCity: this.state.player.currentCity });
      this.showStatus('Strike attempted at current location!', '#c0392b');
    });

    // 2: WAIT
    this.actionBtns[2] = this.makeButton(x(2), btnY, btnW, btnH, 'WAIT', 'btn_wait', () => {
      if (!this.areButtonsEnabled()) { this.showStatus('Not your turn', INK_MID_STR); return; }
      if (this.state?.isPlayerStranded) { this.showStatus('You must move out of the disappearing city!', '#c0392b'); return; }
      this.net.send(ClientMessageType.PLAYER_ACTION, { action: ActionKind.WAIT });
      this.showStatus('Waiting...', INK_MID_STR);
    });

    // 3: GO DEEP (not yet implemented)
    this.actionBtns[3] = this.makeButton(x(3), btnY, btnW, btnH, 'GO DEEP', 'btn_go_deep', () => {
      if (!this.areButtonsEnabled()) { this.showStatus('Not your turn', INK_MID_STR); return; }
      this.showStatus('Not yet available', INK_MID_STR);
    });

    // 4: LOCATE
    this.actionBtns[4] = this.makeButton(x(4), btnY, btnW, btnH, 'LOCATE', 'btn_locate', () => {
      if (!this.areButtonsEnabled()) { this.showStatus('Not your turn', INK_MID_STR); return; }
      if (this.state?.isPlayerStranded) { this.showStatus('You must move out of the disappearing city!', '#c0392b'); return; }
      const LOCATE_COST = 10;
      if (!this.state || this.state.player.intel < LOCATE_COST) {
        this.showStatus(`Locate costs ${LOCATE_COST} Intel. You have ${this.state?.player.intel || 0}.`, '#c0392b');
        return;
      }
      this.net.send(ClientMessageType.PLAYER_ACTION, { action: ActionKind.ABILITY, abilityId: AbilityId.LOCATE });
      this.showStatus('Using Locate ability...', INK_MID_STR);
    });

    // 5: CONTROL — take territorial control of current city
    this.actionBtns[5] = this.makeButton(x(5), btnY, btnW, btnH, 'CONTROL', 'btn_control', () => {
      if (!this.areButtonsEnabled()) { this.showStatus('Not your turn', INK_MID_STR); return; }
      if (this.state?.isPlayerStranded) { this.showStatus('You must move out of the disappearing city!', '#c0392b'); return; }
      const currentCity = this.state?.player.currentCity;
      if (currentCity && this.state?.controlledCities[currentCity] === this.state?.player.side) {
        this.showStatus('Already controlling this city', '#c0392b');
        return;
      }
      this.net.send(ClientMessageType.PLAYER_ACTION, { action: ActionKind.CONTROL });
      this.showStatus('Taking control of city...', INK_MID_STR);
    });

    // 6: PREP (not yet implemented)
    this.actionBtns[6] = this.makeButton(x(6), btnY, btnW, btnH, 'PREP', 'btn_prep', () => {
      if (!this.areButtonsEnabled()) { this.showStatus('Not your turn', INK_MID_STR); return; }
      this.showStatus('Not yet available', INK_MID_STR);
    });

    // 7–9: UNLOCK slots (locked)
    for (let i = 0; i < 3; i++) {
      this.actionBtns[7 + i] = this.makeButton(x(7 + i), btnY, btnW, btnH, 'UNLOCK', 'btn_unlock', () => {
        this.showStatus('Locked ability slot', INK_MID_STR);
      }, true);
    }
  }

  private areButtonsEnabled(): boolean {
    if (!this.state) return false;
    return this.state.currentTurn === this.state.player.side && !this.state.gameOver;
  }

  private makeButton(
    x: number, y: number, w: number, h: number,
    text: string,
    iconKey: string,
    onClick: () => void,
    forceDisabled = false,
  ) {
    const bg = this.add.graphics().setDepth(51);
    this.drawBtn(bg, x, y, w, h, false, false, forceDisabled);

    const icon = this.textures.exists(iconKey)
      ? this.add.image(x, y - 8, iconKey).setDepth(52)
      : null;

    const label = this.add
      .text(x, y + h / 2 - 13, text, {
        fontFamily: FONT_SERIF,
        fontSize: '9px',
        color: INK_DARK_STR,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setDepth(52);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true }).setDepth(53);
    zone.on('pointerdown', onClick);

    let isHovering = false;
    zone.on('pointerover', () => { isHovering = true;  this.updateActionButtons(); });
    zone.on('pointerout',  () => { isHovering = false; this.updateActionButtons(); });
    (zone as any).isHovering = () => isHovering;

    return { bg, label, zone, icon, forceDisabled };
  }

  private drawBtn(
    gfx: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    hover: boolean, active: boolean,
    forceDisabled = false,
  ): void {
    gfx.clear();
    const disabled = forceDisabled || !this.areButtonsEnabled();

    let fillColor: number;
    let borderColor: number;
    let borderAlpha: number;
    let labelColor: string;

    if (disabled) {
      fillColor   = C_BUTTON_DISABLED;
      borderColor = 0xa09878;
      borderAlpha = 0.7;
      labelColor  = '#88806a';
    } else if (active) {
      fillColor   = C_BUTTON_ACTIVE;
      borderColor = C_INK_DARK;
      borderAlpha = 1;
      labelColor  = WHITE_STR;
    } else if (hover) {
      fillColor   = C_PARCHMENT_DARK;
      borderColor = 0x8a6030;
      borderAlpha = 1;
      labelColor  = INK_DARK_STR;
    } else {
      fillColor   = C_PARCHMENT_MID;
      borderColor = C_PARCHMENT_DARK;
      borderAlpha = 1;
      labelColor  = INK_DARK_STR;
    }

    (gfx as any)._labelColor = labelColor;

    gfx.fillStyle(fillColor, 1);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    gfx.lineStyle(1, borderColor, borderAlpha);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4);
  }

  private updateActionButtons(): void {
    if (!this.actionBtns.length) return;
    const disabled   = !this.areButtonsEnabled();
    const isStranded = this.state?.isPlayerStranded ?? false;
    const locateIntel = this.state?.player.intel ?? 0;
    
    // Check if already controlling current city
    const currentCity = this.state?.player.currentCity;
    const alreadyControlling = !!(currentCity && this.state?.controlledCities[currentCity] === this.state?.player.side);

    const enabledMap = [
      disabled,                                      // 0 MOVE
      disabled || isStranded,                        // 1 STRIKE
      disabled || isStranded,                        // 2 WAIT
      disabled,                                      // 3 GO DEEP (not yet implemented)
      disabled || isStranded || locateIntel < 10,    // 4 LOCATE
      disabled || isStranded || alreadyControlling,  // 5 CONTROL
      disabled,                                      // 6 PREP (not yet implemented)
      true, true, true,                              // 7-9 UNLOCK always off
    ];
    const activeMap = [this.actionMode === 'MOVE', false, false, false, false, false, false, false, false, false];

    for (let i = 0; i < this.actionBtns.length; i++) {
      const btn = this.actionBtns[i];
      const isBtnDisabled = btn.forceDisabled || (enabledMap[i] ?? true);
      const isActive      = activeMap[i] ?? false;
      const isHovering    = (btn.zone as any).isHovering?.() ?? false;

      this.drawBtn(btn.bg, btn.zone.x, btn.zone.y, 64, 68, isHovering, isActive, isBtnDisabled);
      btn.label.setColor((btn.bg as any)._labelColor ?? INK_DARK_STR);

      if (btn.icon) {
        if (isBtnDisabled)     btn.icon.setTint(0x908870);
        else if (isActive)     btn.icon.setTint(0xffffff);
        else                   btn.icon.clearTint();
      }
    }
  }

  // ── State handling ───────────────────────────────────────────────

  private boardDrawn = false;

  private onStateUpdate(): void {
    if (!this.state) return;

    if (!this.boardDrawn) {
      this.board = new BoardRenderer(this);
      this.board.drawBoard(this.state.map, this.state);
      if (this.tooltipText) this.board.enableTooltips(this.tooltipText);
      this.boardDrawn = true;
    } else {
      this.board.updateState(this.state);
    }

    const p = this.state.player;
    const isMyTurn = this.state.currentTurn === p.side;

    // Sidebar HUD
    this.playerRoleText.setText(p.side);
    // Action remaining indicator in header
    const totalActions = 2;
    const filled = p.actionsRemaining;
    const bolts = Array(totalActions).fill(0).map((_, i) => i < filled ? '\u25C6' : '\u25C7').join(' ');
    this.boltIconText.setText(bolts);
    this.boltIconText.setColor(filled > 0 ? '#f5f0d8' : '#8a6a5a');

    this.turnText.setText(`${this.state.turnNumber}`);
    // Look up display name for current city
    const cityDef = this.state.map?.cities?.find((c) => c.id === p.currentCity);
    this.cityText.setText(cityDef?.name ?? p.currentCity);
    this.coverText.setText(p.hasCover ? 'ACTIVE' : 'NONE');
    this.coverText.setColor(p.hasCover ? '#3a9a3a' : INK_MID_STR);

    // ACTIONS tile: show filled/empty diamonds for remaining actions
    const actionSymbols = Array(totalActions).fill(0)
      .map((_, i) => i < p.actionsRemaining ? '\u25C6' : '\u25C7').join(' ');
    this.actionsTileValue.setText(actionSymbols);
    this.intelTileValue.setText(`${p.intel}`);

    // Top-right names
    const displayName = p.name || this.registry.get('playerName') || p.side;
    this.playerNameText.setText(displayName);
    this.opponentNameText.setText(`vs ${this.state.opponentName || '???'}`);

    this.updateActionButtons();

    // Timer
    this.lastServerElapsedMs  = this.state.timeElapsedMs || 0;
    this.lastStateUpdateTime  = Date.now();
    if (this.timerDisplay) this.timerDisplay.reset();

    // Turn banner — show once when turn owner changes
    if (this.state.currentTurn !== this.lastTurnOwner) {
      this.lastTurnOwner = this.state.currentTurn;
      this.showTurnBanner(isMyTurn);
    }

    // Auto end-turn
    if (isMyTurn && p.actionsRemaining === 0) {
      this.actionMode = null;
      this.showStatus('No actions remaining — ending turn', INK_MID_STR);
      this.time.delayedCall(800, () => {
        this.net.send(ClientMessageType.END_TURN, {});
      });
    } else if (p.opponentUsedStrike) {
      if (this.state.turnNumber !== this.lastStrikeBannerTurn) {
        this.lastStrikeBannerTurn = this.state.turnNumber;
        this.showOpponentStrikeBanner();
      }
    } else if (p.opponentUsedLocate) {
      if (this.state.turnNumber !== this.lastLocateBannerTurn) {
        this.lastLocateBannerTurn = this.state.turnNumber;
        this.showOpponentLocateBanner();
      }
    } else {
      this.showStatus('', INK_MID_STR);
    }

    this.updateOpponentMarker();
  }

  private showStatus(msg: string, color: string): void {
    this.statusText.setText(msg);
    this.statusText.setColor(color);
  }

  // ── Turn Banner ──────────────────────────────────────────────────

  private showTurnBanner(isMyTurn: boolean): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const bannerW = 360;
    const bannerH = 56;
    const bannerX = w / 2;
    const bannerY = h / 2 - 80;
    const bannerColor = isMyTurn ? C_BANNER_RED : C_BANNER_GREEN;
    const bannerText  = isMyTurn ? 'Your Turn!' : "Target's Turn";

    const bg = this.add.rectangle(bannerX, bannerY - 80, bannerW, bannerH, bannerColor, 1)
      .setDepth(510)
      .setOrigin(0.5);

    const t = this.add.text(bannerX, bannerY - 80, bannerText, {
      fontFamily: FONT_SERIF,
      fontSize: '26px',
      color: WHITE_STR,
      fontStyle: 'bold italic',
    }).setOrigin(0.5).setDepth(511);

    // Slide in from above
    this.tweens.add({
      targets: [bg, t],
      y: bannerY,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Auto-dismiss after 2s
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: [bg, t],
        alpha: 0,
        duration: 400,
        onComplete: () => { bg.destroy(); t.destroy(); },
      });
    });
  }

  // ── Game Over Modal ──────────────────────────────────────────────

  private showGameOverModal(winner: PlayerSide, reason: string): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const isVictory = winner === this.state?.player.side;

    // Overlay scrim
    this.add.rectangle(w / 2, h / 2, w, h, 0x140a05, 0.65).setDepth(1000);

    // Parchment card
    const cardW = 560;
    const cardH = 320;
    const card = this.add.rectangle(w / 2, h / 2, cardW, cardH, C_PARCHMENT_LIGHT, 1)
      .setDepth(1001)
      .setStrokeStyle(3, C_PARCHMENT_DARK);

    void card; // suppress unused warning

    // Stamp heading
    const stampColor = isVictory ? C_STAMP_BLUE : C_TARGET_RED;
    const stampText  = isVictory ? 'VICTORY' : 'DEFEAT';
    this.add.text(w / 2, h / 2 - 100, stampText, {
      fontFamily: FONT_SERIF,
      fontSize: '64px',
      color: Phaser.Display.Color.IntegerToColor(stampColor).rgba,
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5).setDepth(1002);

    // Sub-text
    const subMsg = isVictory ? 'A decisive win. Great work, agent.' : reason;
    this.add.text(w / 2, h / 2 - 28, subMsg, {
      fontFamily: FONT_SERIF,
      fontSize: '18px',
      color: INK_MID_STR,
      align: 'center',
      wordWrap: { width: cardW - 60 },
    }).setOrigin(0.5).setDepth(1002);

    // Player markers
    const markerY = h / 2 + 30;
    this.add.image(w / 2 - 60, markerY, 'spy_marker').setDepth(1002).setScale(1.2);
    this.add.image(w / 2 + 60, markerY, 'opponent_marker').setDepth(1002).setScale(1.2);

    // Names
    const nameStyle = {
      fontFamily: FONT_SERIF, fontSize: '13px',
      color: INK_DARK_STR, fontStyle: 'bold',
    };
    const playerName = this.state?.player.name || this.registry.get('playerName') || winner;
    const oppName    = this.state?.opponentName || '???';
    this.add.text(w / 2 - 60, markerY + 30, playerName, nameStyle).setOrigin(0.5).setDepth(1002);
    this.add.text(w / 2 + 60, markerY + 30, oppName,    nameStyle).setOrigin(0.5).setDepth(1002);

    // "Next game..." hint
    this.add.text(w / 2, h / 2 + 110, 'Next game in...', {
      fontFamily: FONT_SERIF,
      fontSize: '13px',
      color: INK_MID_STR,
    }).setOrigin(0.5).setDepth(1002);
  }

  private updateOpponentMarker(): void {
    if (!this.board || !this.state) return;
    this.board.updateOpponentLocation(this.state.player.knownOpponentCity);
  }

  // ── Notification Banners ─────────────────────────────────────────

  private showNotificationBanner(
    line1: string,
    line2: string,
    borderColor: number,
    durationMs = 3500,
  ): void {
    this.dismissActiveBanner();

    const w = this.cameras.main.width;
    const bannerW = 420;
    const bannerH = 60;
    const bannerX = w / 2;
    const bannerY = 90;

    const bg = this.add.rectangle(bannerX, bannerY - 50, bannerW, bannerH, C_PARCHMENT_MID, 0.96)
      .setDepth(500)
      .setStrokeStyle(2, borderColor)
      .setOrigin(0.5);

    const t1 = this.add.text(bannerX, bannerY - 50 - 10, line1, {
      fontFamily: FONT_SERIF,
      fontSize: '14px',
      color: Phaser.Display.Color.IntegerToColor(borderColor).rgba,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(501);

    const t2 = this.add.text(bannerX, bannerY - 50 + 12, line2, {
      fontFamily: FONT_SERIF,
      fontSize: '12px',
      color: INK_MID_STR,
    }).setOrigin(0.5).setDepth(501);

    this.activeBannerObjects = [bg, t1, t2];

    this.tweens.add({
      targets: [bg, t1, t2],
      y: `+=${50}`,
      duration: 250,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(durationMs, () => {
      if (this.activeBannerObjects[0] === bg) {
        this.tweens.add({
          targets: [bg, t1, t2],
          alpha: 0,
          duration: 400,
          onComplete: () => {
            bg.destroy(); t1.destroy(); t2.destroy();
            if (this.activeBannerObjects[0] === bg) this.activeBannerObjects = [];
          },
        });
      }
    });
  }

  private dismissActiveBanner(): void {
    if (this.activeBannerObjects.length > 0) {
      this.tweens.killTweensOf(this.activeBannerObjects);
      this.activeBannerObjects.forEach(o => o.destroy());
      this.activeBannerObjects = [];
    }
  }

  private showOpponentStrikeBanner(): void {
    this.showNotificationBanner(
      'YOUR OPPONENT STRUCK!',
      'They missed — your position is safe.',
      C_TARGET_RED,
    );
  }

  private showOpponentLocateBanner(): void {
    this.showNotificationBanner(
      'OPPONENT USED LOCATE',
      'Your current position may be known.',
      0xc8763a,
    );
  }
}
