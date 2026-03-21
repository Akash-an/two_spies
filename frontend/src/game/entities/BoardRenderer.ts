/**
 * BoardRenderer — draws the city graph (nodes + edges) and the player marker.
 *
 * All coordinates in MapDef are normalised 0–1.  BoardRenderer maps them into
 * a padded rectangle within the Phaser scene camera, accounting for the
 * left sidebar (85 px) and bottom action bar (82 px).
 */

import Phaser from 'phaser';
import { CityDef, EdgeDef, MapDef, MatchState, PlayerSide } from '../../types/Messages';

/** Layout constants — must match GameScene */
const SIDEBAR_W = 130;
const ACTION_BAR_H = 82;
const PAD_TOP = 16;
const PAD_LEFT = 15;   // gap between sidebar right edge and first city
const PAD_RIGHT = 75;  // accounts for 65px right parchment strip + 10px margin

/** Palette */
const COL_EDGE          = 0x7a4030;  // MAP_EDGE brown/rust
const COL_EDGE_ADJACENT = 0xcc3322;  // MAP_EDGE_ADJACENT red
const COL_CITY_LABEL          = '#2a1a0a';  // INK_DARK
const COL_CITY_LABEL_CURRENT  = '#4db84e';  // SPY_GREEN (current city)

export interface CitySprite {
  id: string;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  highlight?: Phaser.GameObjects.Image;
  screenX: number;
  screenY: number;
  disappearedOverlay?: Phaser.GameObjects.Graphics;  // Grey X overlay for disappeared cities
  scheduledPulseRing?: Phaser.GameObjects.Graphics;  // Pulsing gold border for scheduled disappearing
  controlledOverlay?: Phaser.GameObjects.Graphics;   // Solid color overlay for controlled cities
  controlledBy?: PlayerSide;  // Track current controller to detect changes
}

export class BoardRenderer {
  private scene: Phaser.Scene;
  private edgeGraphics!: Phaser.GameObjects.Graphics;
  private citySprites: Map<string, CitySprite> = new Map();
  private spyMarker!: Phaser.GameObjects.Image;
  private spyMarkerBorder: Phaser.GameObjects.Graphics | null = null;
  private opponentMarker: Phaser.GameObjects.Image | null = null;
  private tooltipText: Phaser.GameObjects.Text | null = null;
  private cityData: Map<string, CityDef> = new Map();

  private playerStartMarker: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Text] | null = null;
  private opponentStartMarker: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Text] | null = null;

  private mapW = 0;
  private mapH = 0;
  private originX = 0;
  private originY = 0;
  private currentPlayerSide: PlayerSide = 'RED';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Apply cover styling to the spy marker.
   * - hasCover=false (visible): solid colored icon
   * - hasCover=true (hidden): translucent icon with player-color border
   */
  private applySpyMarkerStyling(hasCover: boolean, playerSide: PlayerSide): void {
    if (!this.spyMarker) return;

    if (hasCover) {
      // Hidden state: translucent with player-color border
      this.spyMarker.setAlpha(0.45);
      
      // Create border graphics if needed
      if (!this.spyMarkerBorder) {
        this.spyMarkerBorder = this.scene.add.graphics().setDepth(9);
      }
      
      // Draw border around the player icon
      this.spyMarkerBorder.clear();
      const borderColor = playerSide === 'RED' ? 0xff5555 : 0x5555ff;
      this.spyMarkerBorder.lineStyle(4, borderColor, 1);
      this.spyMarkerBorder.strokeCircle(this.spyMarker.x, this.spyMarker.y, 16);
    } else {
      // Visible state: solid colored icon with no border
      this.spyMarker.setAlpha(1);
      
      // Clear border
      if (this.spyMarkerBorder) {
        this.spyMarkerBorder.clear();
      }
    }
  }

  /** Helper to redraw border at marker's current position. */
  private redrawSpyMarkerBorder(): void {
    if (!this.spyMarker || !this.spyMarkerBorder) return;
    
    this.spyMarkerBorder.clear();
    if (this.spyMarker.alpha < 0.9) {  // Only draw border if in cover (translucent)
      const borderColor = this.currentPlayerSide === 'RED' ? 0xff5555 : 0x5555ff;
      this.spyMarkerBorder.lineStyle(4, borderColor, 1);
      this.spyMarkerBorder.strokeCircle(this.spyMarker.x, this.spyMarker.y, 16);
    }
  }

  /** Call once in `create()` to draw the full board for the given map. */
  drawBoard(map: MapDef, state: MatchState): void {
    const cam = this.scene.cameras.main;
    this.originX = SIDEBAR_W + PAD_LEFT;
    this.originY = PAD_TOP;
    this.mapW = cam.width - this.originX - PAD_RIGHT;
    // Stretch map vertically so cities fill more of the canvas.
    // City y-coords max at ~0.62; dividing by 0.72 gives ~86% canvas fill.
    this.mapH = (cam.height - this.originY - ACTION_BAR_H - PAD_TOP) / 0.72;

    this.edgeGraphics = this.scene.add.graphics().setDepth(3);
    this.drawEdges(map.edges, map.cities, state);

    for (const city of map.cities) {
      this.drawCity(city, state);
    }

    // Store player side for border styling
    this.currentPlayerSide = state.player.side;

    const playerCity = this.citySprites.get(state.player.currentCity);
    this.spyMarker = this.scene.add
      .image(playerCity?.screenX ?? 0, playerCity?.screenY ?? 0, 'spy_marker')
      .setDepth(10);
    
    // Apply cover styling based on visibility state
    this.applySpyMarkerStyling(state.player.hasCover, state.player.side);

    // Show opponent's icon at their starting city (both players know starting positions)
    // Use opponentStartingCity if available, otherwise try knownOpponentCity
    let opponentCity: string | undefined = state.player.opponentStartingCity;
    
    if (!opponentCity && state.player.knownOpponentCity) {
      opponentCity = state.player.knownOpponentCity;
    }
    
    if (opponentCity && this.citySprites.has(opponentCity)) {
      this.drawOpponentMarkerAtStartingCity(opponentCity);
    }

    this.highlightAdjacent(state.player.currentCity, map);
  }

  /** Draw opponent marker at starting city or known location. */
  private drawOpponentMarkerAtStartingCity(opponentCityId: string): void {
    const cs = this.citySprites.get(opponentCityId);
    
    if (!cs) {
      console.warn('[BoardRenderer] No city sprite found for opponent city:', opponentCityId);
      return;
    }
    
    if (this.opponentMarker) {
      // Marker already exists; don't recreate
      return;
    }
    
    // Create opponent marker using the opponent_marker image asset
    this.opponentMarker = this.scene.add
      .image(cs.screenX, cs.screenY, 'opponent_marker')
      .setDepth(200);
    
    // Add pulsing animation to show uncertainty
    this.scene.tweens.add({
      targets: this.opponentMarker,
      alpha: { from: 1, to: 0.5 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Move the spy marker and update highlights after state changes. */
  updateState(state: MatchState): void {
    const target = this.citySprites.get(state.player.currentCity);
    if (target && this.spyMarker) {
      this.scene.tweens.add({
        targets: this.spyMarker,
        x: target.screenX,
        y: target.screenY,
        duration: 300,
        ease: 'Power2',
        onUpdate: () => {
          // Keep border synchronized with marker during movement
          this.redrawSpyMarkerBorder();
        },
      });
    }

    // Update spy marker styling based on cover state
    this.applySpyMarkerStyling(state.player.hasCover, state.player.side);

    for (const [id, cs] of this.citySprites) {
      cs.label.setColor(
        id === state.player.currentCity ? COL_CITY_LABEL_CURRENT : COL_CITY_LABEL,
      );
    }

    // Update disappeared city overlays
    const disappearedSet = new Set(state.disappearedCities ?? []);
    for (const [cityId, cs] of this.citySprites) {
      if (disappearedSet.has(cityId) && !cs.disappearedOverlay) {
        cs.sprite.setAlpha(0.3);
        cs.label.setAlpha(0.3);
        const overlay = this.scene.add.graphics().setDepth(6);
        overlay.lineStyle(4, 0xcc3322, 0.8);
        const size = 10;
        overlay.beginPath();
        overlay.moveTo(cs.screenX - size, cs.screenY - size);
        overlay.lineTo(cs.screenX + size, cs.screenY + size);
        overlay.strokePath();
        overlay.beginPath();
        overlay.moveTo(cs.screenX + size, cs.screenY - size);
        overlay.lineTo(cs.screenX - size, cs.screenY + size);
        overlay.strokePath();
        cs.disappearedOverlay = overlay;
      }
    }

    // Update scheduled disappearing city pulse ring
    for (const [cityId, cs] of this.citySprites) {
      const isScheduled = state.scheduledDisappearCity === cityId;
      if (isScheduled && !cs.scheduledPulseRing) {
        const ring = this.scene.add.graphics().setDepth(6);
        ring.lineStyle(3, 0xc8a96e, 0.9);  // PARCHMENT_DARK gold
        ring.strokeCircle(cs.screenX, cs.screenY, 26);
        ring.lineStyle(1, 0xc8a96e, 0.4);
        ring.strokeCircle(cs.screenX, cs.screenY, 20);
        this.scene.tweens.add({
          targets: ring,
          alpha: { from: 1, to: 0.35 },
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        cs.scheduledPulseRing = ring;
      } else if (!isScheduled && cs.scheduledPulseRing) {
        this.scene.tweens.killTweensOf(cs.scheduledPulseRing);
        cs.scheduledPulseRing.destroy();
        cs.scheduledPulseRing = undefined;
      }
    }

    // Update controlled city overlays
    for (const [cityId, cs] of this.citySprites) {
      const controller = state.controlledCities?.[cityId];
      const oldController = cs.controlledBy;
      
      // Check if controller changed (or new/removed)
      if (controller !== oldController) {
        // Destroy old overlay if it exists
        if (cs.controlledOverlay) {
          cs.controlledOverlay.destroy();
          cs.controlledOverlay = undefined;
        }
        
        // Create new overlay if city is now controlled
        if (controller) {
          const overlay = this.scene.add.graphics().setDepth(5);
          const color = controller === 'RED' ? 0xff5555 : 0x5555ff;
          overlay.fillStyle(color, 0.35);
          overlay.fillCircle(cs.screenX, cs.screenY, 16);
          
          cs.controlledOverlay = overlay;
          cs.controlledBy = controller;
        } else {
          cs.controlledBy = undefined;
        }
      }
    }

    // Clear the player's own start marker once they've moved away
    if (this.playerStartMarker && state.player.currentCity !== state.player.startingCity) {
      this.playerStartMarker[0].destroy();
      this.playerStartMarker[1].destroy();
      this.playerStartMarker = null;
    }

    if (this.opponentStartMarker && state.opponentMovedFromStart) {
      this.opponentStartMarker[0].destroy();
      this.opponentStartMarker[1].destroy();
      this.opponentStartMarker = null;
    }

    this.highlightAdjacent(state.player.currentCity, state.map);
  }

  /** Show or hide opponent location marker. Updates position when location is revealed. */
  updateOpponentLocation(knownOpponentCity: string | null | undefined): void {
    if (!knownOpponentCity) {
      // Clear opponent marker if location is unknown
      if (this.opponentMarker) {
        this.scene.tweens.killTweensOf(this.opponentMarker);
        this.opponentMarker.destroy();
        this.opponentMarker = null;
      }
      return;
    }

    const cs = this.citySprites.get(knownOpponentCity);
    if (!cs) return;

    if (this.opponentMarker) {
      // Update existing marker position with animation
      this.scene.tweens.add({
        targets: this.opponentMarker,
        x: cs.screenX,
        y: cs.screenY,
        duration: 300,
        ease: 'Power2',
      });
    } else {
      // Create new opponent marker
      this.opponentMarker = this.scene.add
        .image(cs.screenX, cs.screenY, 'opponent_marker')
        .setDepth(11);
      // Add pulsing animation to show uncertainty
      this.scene.tweens.add({
        targets: this.opponentMarker,
        alpha: { from: 1, to: 0.5 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Returns the city ID that was clicked, or null. */
  getCityAtPointer(pointer: Phaser.Input.Pointer): string | null {
    for (const [id, cs] of this.citySprites) {
      const dx = pointer.worldX - cs.screenX;
      const dy = pointer.worldY - cs.screenY;
      if (dx * dx + dy * dy < 20 * 20) return id;
    }
    return null;
  }

  // ── private rendering helpers ──────────────────────────────────

  private toScreen(nx: number, ny: number): { x: number; y: number } {
    return {
      x: this.originX + nx * this.mapW,
      y: this.originY + ny * this.mapH,
    };
  }

  private drawEdges(edges: EdgeDef[], cities: CityDef[], state?: MatchState): void {
    const lookup = new Map<string, CityDef>();
    for (const c of cities) lookup.set(c.id, c);

    const disappearedCities = new Set(state?.disappearedCities ?? []);
    const playerCurrentCity = state?.player.currentCity ?? '';
    const isPlayerStranded  = state?.isPlayerStranded ?? false;

    this.edgeGraphics.lineStyle(2, COL_EDGE, 0.85);
    for (const e of edges) {
      const edgeHasDisappeared = disappearedCities.has(e.from) || disappearedCities.has(e.to);
      if (edgeHasDisappeared) {
        const playerInEdge = isPlayerStranded && (e.from === playerCurrentCity || e.to === playerCurrentCity);
        if (!playerInEdge) continue;
      }
      const a = lookup.get(e.from);
      const b = lookup.get(e.to);
      if (!a || !b) continue;
      const pa = this.toScreen(a.x, a.y);
      const pb = this.toScreen(b.x, b.y);
      this.edgeGraphics.beginPath();
      this.edgeGraphics.moveTo(pa.x, pa.y);
      this.edgeGraphics.lineTo(pb.x, pb.y);
      this.edgeGraphics.strokePath();
    }
  }

  private drawCity(city: CityDef, state: MatchState): void {
    const pos = this.toScreen(city.x, city.y);
    this.cityData.set(city.id, city);

    const sprite = this.scene.add
      .image(pos.x, pos.y, 'city')
      .setInteractive({ useHandCursor: true })
      .setDepth(5);

    const label = this.scene.add
      .text(pos.x, pos.y + 14, city.name, {
        fontFamily: "'Georgia', serif",
        fontSize: '11px',
        color: COL_CITY_LABEL,
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(5);

    const citySprite: CitySprite = { id: city.id, sprite, label, screenX: pos.x, screenY: pos.y };

    const isDisappeared = state.disappearedCities?.includes(city.id) ?? false;
    if (isDisappeared) {
      sprite.setAlpha(0.3);
      label.setAlpha(0.3);
      const overlay = this.scene.add.graphics().setDepth(6);
      overlay.lineStyle(4, 0xcc3322, 0.8);
      const size = 10;
      overlay.beginPath();
      overlay.moveTo(pos.x - size, pos.y - size);
      overlay.lineTo(pos.x + size, pos.y + size);
      overlay.strokePath();
      overlay.beginPath();
      overlay.moveTo(pos.x + size, pos.y - size);
      overlay.lineTo(pos.x - size, pos.y + size);
      overlay.strokePath();
      citySprite.disappearedOverlay = overlay;
    }

    const isScheduled = state.scheduledDisappearCity === city.id;
    if (isScheduled) {
      const ring = this.scene.add.graphics().setDepth(6);
      ring.lineStyle(3, 0xc8a96e, 0.9);
      ring.strokeCircle(pos.x, pos.y, 26);
      ring.lineStyle(1, 0xc8a96e, 0.4);
      ring.strokeCircle(pos.x, pos.y, 20);
      this.scene.tweens.add({
        targets: ring,
        alpha: { from: 1, to: 0.35 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      citySprite.scheduledPulseRing = ring;
    }

    // Handle controlled cities: solid color overlay
    const controller = state.controlledCities?.[city.id];
    if (controller) {
      const overlay = this.scene.add.graphics().setDepth(5);
      // Use player colors: RED cities get red overlay, BLUE cities get blue overlay
      const color = controller === 'RED' ? 0xff5555 : 0x5555ff;
      // Solid fill with transparency to show the city underneath
      overlay.fillStyle(color, 0.35);
      overlay.fillCircle(pos.x, pos.y, 16);
      
      citySprite.controlledOverlay = overlay;
      citySprite.controlledBy = controller;
    }

    this.citySprites.set(city.id, citySprite);
  }

  /** Enable hover tooltips on cities. Call after drawBoard(). */
  enableTooltips(tooltipText: Phaser.GameObjects.Text | null): void {
    if (!tooltipText) return;
    this.tooltipText = tooltipText;

    for (const [cityId, cs] of this.citySprites) {
      const city = this.cityData.get(cityId);
      if (!city) continue;

      cs.sprite.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (!this.tooltipText) return;
        this.tooltipText.setText(city.name);
        this.tooltipText.setPosition(pointer.x + 14, pointer.y - 10);
        this.tooltipText.setVisible(true);
      });
      cs.sprite.on('pointerout', () => {
        if (this.tooltipText) this.tooltipText.setVisible(false);
      });
      cs.sprite.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.tooltipText?.visible) {
          this.tooltipText.setPosition(pointer.x + 14, pointer.y - 10);
        }
      });
    }
  }

  private highlightAdjacent(currentCity: string, map: MapDef): void {
    for (const cs of this.citySprites.values()) {
      cs.highlight?.destroy();
      cs.highlight = undefined;
    }

    this.edgeGraphics.clear();
    const lookup = new Map<string, CityDef>();
    for (const c of map.cities) lookup.set(c.id, c);

    const adjSet = new Set<string>();
    for (const e of map.edges) {
      if (e.from === currentCity) adjSet.add(e.to);
      if (e.to === currentCity) adjSet.add(e.from);
    }

    for (const e of map.edges) {
      const isAdj =
        (e.from === currentCity && adjSet.has(e.to)) ||
        (e.to === currentCity && adjSet.has(e.from));

      const a = lookup.get(e.from);
      const b = lookup.get(e.to);
      if (!a || !b) continue;
      const pa = this.toScreen(a.x, a.y);
      const pb = this.toScreen(b.x, b.y);

      if (isAdj) {
        // Dashed red for adjacent edges
        this.edgeGraphics.lineStyle(2, COL_EDGE_ADJACENT, 0.9);
        this.edgeGraphics.beginPath();
        this.edgeGraphics.moveTo(pa.x, pa.y);
        this.edgeGraphics.lineTo(pb.x, pb.y);
        this.edgeGraphics.strokePath();
      } else {
        this.edgeGraphics.lineStyle(2, COL_EDGE, 0.55);
        this.edgeGraphics.beginPath();
        this.edgeGraphics.moveTo(pa.x, pa.y);
        this.edgeGraphics.lineTo(pb.x, pb.y);
        this.edgeGraphics.strokePath();
      }
    }

    // Clean up old highlights (if any)
    for (const cs of this.citySprites.values()) {
      cs.highlight?.destroy();
      cs.highlight = undefined;
    }
  }
}
