/**
 * BoardRenderer — draws the city graph (nodes + edges) and the player marker.
 *
 * All coordinates in MapDef are normalised 0–1.  BoardRenderer maps them into
 * a padded rectangle within the Phaser scene camera.
 */

import Phaser from 'phaser';
import { CityDef, EdgeDef, MapDef, MatchState } from '../../types/Messages';

/** Padding from canvas edge (pixels). */
const PAD = 80;

/** Colours */
const COL_EDGE = 0x5577aa;  // Brighter blue for better visibility
const COL_EDGE_ADJACENT = 0x66ddff;  // Brighter cyan for adjacent edges
const COL_CITY_LABEL = '#cccce0';
const COL_CITY_LABEL_CURRENT = '#e0c872';

export interface CitySprite {
  id: string;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  highlight?: Phaser.GameObjects.Image;
  screenX: number;
  screenY: number;
  disappearedOverlay?: Phaser.GameObjects.Graphics;  // Grey X overlay for disappeared cities
  scheduledPulseRing?: Phaser.GameObjects.Graphics;  // Pulsing gold border for scheduled disappearing
}

export class BoardRenderer {
  private scene: Phaser.Scene;
  private edgeGraphics!: Phaser.GameObjects.Graphics;
  private citySprites: Map<string, CitySprite> = new Map();
  private spyMarker!: Phaser.GameObjects.Image;
  private opponentMarker: Phaser.GameObjects.Graphics | null = null;
  private tooltipText: Phaser.GameObjects.Text | null = null;
  private cityData: Map<string, CityDef> = new Map();

  // Starting city markers — cleared when the respective player first moves
  // Each entry is [ring: Graphics, label: Text] so both are destroyed together.
  private playerStartMarker: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Text] | null = null;
  private opponentStartMarker: [Phaser.GameObjects.Graphics, Phaser.GameObjects.Text] | null = null;

  private mapW = 0;
  private mapH = 0;
  private originX = 0;
  private originY = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Call once in `create()` to draw the full board for the given map. */
  drawBoard(map: MapDef, state: MatchState): void {
    const cam = this.scene.cameras.main;
    this.originX = PAD;
    this.originY = PAD;
    this.mapW = cam.width - PAD * 2;
    this.mapH = cam.height - PAD * 2;

    // Draw edges first (behind cities)
    this.edgeGraphics = this.scene.add.graphics();
    this.drawEdges(map.edges, map.cities, state);

    // Draw city nodes
    for (const city of map.cities) {
      this.drawCity(city, state);
    }

    // Player spy marker
    const playerCity = this.citySprites.get(state.player.currentCity);
    this.spyMarker = this.scene.add
      .image(playerCity?.screenX ?? 0, playerCity?.screenY ?? 0, 'spy_marker')
      .setDepth(10);

    // Starting city markers (shown until each player first moves)
    this.drawStartingMarkers(state);

    // Highlight reachable cities
    this.highlightAdjacent(state.player.currentCity, map);
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
      });
    }

    // Update labels — highlight current city
    for (const [id, cs] of this.citySprites) {
      cs.label.setColor(
        id === state.player.currentCity ? COL_CITY_LABEL_CURRENT : COL_CITY_LABEL,
      );
    }
    
    // Update disappeared cities visuals
    const disappearedSet = new Set(state.disappearedCities ?? []);
    for (const [cityId, cs] of this.citySprites) {
      const isDisappeared = disappearedSet.has(cityId);
      
      if (isDisappeared && !cs.disappearedOverlay) {
        // City just disappeared - add overlay
        cs.sprite.setAlpha(0.3);
        cs.label.setAlpha(0.3);
        
        const overlay = this.scene.add.graphics().setDepth(6);
        overlay.lineStyle(4, 0xff3333, 0.8);
        
        const size = 12;
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
    
    // Update scheduled disappearing city visual
    for (const [cityId, cs] of this.citySprites) {
      const isScheduled = state.scheduledDisappearCity === cityId;
      
      if (isScheduled && !cs.scheduledPulseRing) {
        // City just scheduled - add pulse ring
        const pulseRing = this.scene.add.graphics().setDepth(6);
        
        const updatePulseRing = () => {
          pulseRing.clear();
          pulseRing.lineStyle(3, 0xffdd44, 0.8);
          pulseRing.strokeCircle(cs.screenX, cs.screenY, 26);
          
          pulseRing.lineStyle(1, 0xffdd44, 0.4);
          pulseRing.strokeCircle(cs.screenX, cs.screenY, 20);
        };
        
        updatePulseRing();
        
        this.scene.tweens.add({
          targets: pulseRing,
          alpha: { from: 1, to: 0.4 },
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        
        cs.scheduledPulseRing = pulseRing;
      } else if (!isScheduled && cs.scheduledPulseRing) {
        // City no longer scheduled - remove pulse ring
        this.scene.tweens.killTweensOf(cs.scheduledPulseRing);
        cs.scheduledPulseRing.destroy();
        cs.scheduledPulseRing = undefined;
      }
    }

    // Clear the player's own start marker once they've moved away
    if (this.playerStartMarker && state.player.currentCity !== state.player.startingCity) {
      this.playerStartMarker[0].destroy();
      this.playerStartMarker[1].destroy();
      this.playerStartMarker = null;
    }

    // Clear the opponent's start marker once they've moved away from their start
    if (this.opponentStartMarker && state.opponentMovedFromStart) {
      this.opponentStartMarker[0].destroy();
      this.opponentStartMarker[1].destroy();
      this.opponentStartMarker = null;
    }

    this.highlightAdjacent(state.player.currentCity, state.map);
  }

  /** Show or hide opponent location marker (yellow blip). */
  updateOpponentLocation(knownOpponentCity: string | null | undefined): void {
    // Remove existing marker
    if (this.opponentMarker) {
      this.opponentMarker.destroy();
      this.opponentMarker = null;
    }

    // If opponent location is known, show prominent yellow marker
    if (knownOpponentCity) {
      const citySprite = this.citySprites.get(knownOpponentCity);
      if (citySprite) {
        this.opponentMarker = this.scene.add.graphics().setDepth(15);
        
        // Draw outer pulsing ring (larger, bright yellow)
        this.opponentMarker.lineStyle(4, 0xffee44, 0.9);
        this.opponentMarker.strokeCircle(citySprite.screenX, citySprite.screenY, 24);
        
        // Draw middle ring
        this.opponentMarker.lineStyle(3, 0xffdd44, 0.8);
        this.opponentMarker.strokeCircle(citySprite.screenX, citySprite.screenY, 18);
        
        // Draw inner filled circle (bright yellow)
        this.opponentMarker.fillStyle(0xffdd44, 0.7);
        this.opponentMarker.fillCircle(citySprite.screenX, citySprite.screenY, 14);
        
        // Add alpha pulsing animation (stays within city bounds)
        this.scene.tweens.add({
          targets: this.opponentMarker,
          alpha: { from: 1, to: 0.4 },
          duration: 500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    }
  }

  /**
   * Draw start-position rings for both players.
   *
   * - Own start: blue dashed ring — clears when the player first moves.
   * - Opponent start: red dashed ring — clears when the opponent first moves.
   *
   * Both cities are known at match start (shared information per GDD §2).
   */
  private drawStartingMarkers(state: MatchState): void {
    // Returns [ring, label] so both can be destroyed together when the marker is cleared.
    const drawRing = (
      cityId: string,
      color: number,
      label: string,
    ): [Phaser.GameObjects.Graphics, Phaser.GameObjects.Text] | null => {
      const cs = this.citySprites.get(cityId);
      if (!cs) return null;

      const gfx = this.scene.add.graphics().setDepth(7);

      // Outer ring
      gfx.lineStyle(3, color, 0.9);
      gfx.strokeCircle(cs.screenX, cs.screenY, 26);

      // Inner thin ring
      gfx.lineStyle(1, color, 0.5);
      gfx.strokeCircle(cs.screenX, cs.screenY, 20);

      // Label stored alongside the ring so it can be destroyed with it
      const txt = this.scene.add
        .text(cs.screenX, cs.screenY - 34, label, {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: Phaser.Display.Color.IntegerToColor(color).rgba,
        })
        .setOrigin(0.5, 1)
        .setDepth(7);

      // Gentle pulse on the ring (not the text — avoids jitter)
      this.scene.tweens.add({
        targets: gfx,
        alpha: { from: 1, to: 0.5 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      return [gfx, txt];
    };

    this.playerStartMarker  = drawRing(state.player.startingCity,         0x44aaff, 'YOUR START');
    this.opponentStartMarker = drawRing(state.player.opponentStartingCity, 0xff5555, 'OPP START');
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
    const isPlayerStranded = state?.isPlayerStranded ?? false;

    this.edgeGraphics.lineStyle(3, COL_EDGE, 0.7);  // Increased thickness and opacity
    for (const e of edges) {
      // Skip edges connected to disappeared cities UNLESS player is stranded in one of them
      const edgeConnectedToDisappeared = disappearedCities.has(e.from) || disappearedCities.has(e.to);
      
      if (edgeConnectedToDisappeared) {
        // If player is stranded, keep edges from their current city visible (so they can escape)
        const playerInEdge = isPlayerStranded && (e.from === playerCurrentCity || e.to === playerCurrentCity);
        if (!playerInEdge) {
          continue;  // Skip this edge
        }
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

    // Store city data for tooltip
    this.cityData.set(city.id, city);

    // All cities now use the same texture
    const textureKey = 'city';

    const sprite = this.scene.add
      .image(pos.x, pos.y, textureKey)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);

    const label = this.scene.add
      .text(pos.x, pos.y + 22, city.name, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: COL_CITY_LABEL,
        align: 'center',
      })
      .setOrigin(0.5, 0)
      .setDepth(5);

    const citySprite: CitySprite = {
      id: city.id,
      sprite,
      label,
      screenX: pos.x,
      screenY: pos.y,
    };
    
    // Handle disappeared cities: grey overlay with red X
    const isDisappeared = state.disappearedCities?.includes(city.id) ?? false;
    if (isDisappeared) {
      // Dim the city sprite
      sprite.setAlpha(0.3);
      label.setAlpha(0.3);
      
      // Create red X overlay
      const overlay = this.scene.add.graphics().setDepth(6);
      overlay.lineStyle(4, 0xff3333, 0.8);
      
      // Draw X
      const size = 12;
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
    
    // Handle scheduled disappearing cities: pulsing gold border
    const isScheduled = state.scheduledDisappearCity === city.id;
    if (isScheduled) {
      const pulseRing = this.scene.add.graphics().setDepth(6);
      
      const updatePulseRing = () => {
        pulseRing.clear();
        // Outer ring (pulsing)
        pulseRing.lineStyle(3, 0xffdd44, 0.8);
        pulseRing.strokeCircle(pos.x, pos.y, 26);
        
        // Inner ring
        pulseRing.lineStyle(1, 0xffdd44, 0.4);
        pulseRing.strokeCircle(pos.x, pos.y, 20);
      };
      
      updatePulseRing();
      
      // Animate pulse
      this.scene.tweens.add({
        targets: pulseRing,
        alpha: { from: 1, to: 0.4 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      
      citySprite.scheduledPulseRing = pulseRing;
    }

    this.citySprites.set(city.id, citySprite);
  }

  /** Enable hover tooltips on cities. Call after drawBoard(). */
  enableTooltips(tooltipText: Phaser.GameObjects.Text | null): void {
    if (!tooltipText) {
      console.warn('[BoardRenderer] enableTooltips called with null tooltipText');
      return;
    }
    this.tooltipText = tooltipText;

    for (const [cityId, cs] of this.citySprites) {
      const city = this.cityData.get(cityId);
      if (!city) continue;

      // Show tooltip on hover
      cs.sprite.on('pointerover', (pointer: Phaser.Input.Pointer) => {
        if (!this.tooltipText) return;
        
        // All cities are now uniform
        const typeText = 'City';
        
        this.tooltipText.setText(`${city.name}\n${typeText}`);
        this.tooltipText.setPosition(pointer.x + 12, pointer.y - 8);
        this.tooltipText.setVisible(true);
      });

      // Hide tooltip when pointer leaves
      cs.sprite.on('pointerout', () => {
        if (this.tooltipText) {
          this.tooltipText.setVisible(false);
        }
      });

      // Update tooltip position while hovering
      cs.sprite.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (this.tooltipText && this.tooltipText.visible) {
          this.tooltipText.setPosition(pointer.x + 12, pointer.y - 8);
        }
      });
    }
  }

  private highlightAdjacent(currentCity: string, map: MapDef): void {
    // Remove old highlights
    for (const cs of this.citySprites.values()) {
      cs.highlight?.destroy();
      cs.highlight = undefined;
    }

    // Redraw edges with adjacency colour
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

      // Adjacent edges are brighter and thicker; non-adjacent are still clearly visible
      this.edgeGraphics.lineStyle(isAdj ? 4 : 3, isAdj ? COL_EDGE_ADJACENT : COL_EDGE, isAdj ? 0.9 : 0.6);
      this.edgeGraphics.beginPath();
      this.edgeGraphics.moveTo(pa.x, pa.y);
      this.edgeGraphics.lineTo(pb.x, pb.y);
      this.edgeGraphics.strokePath();
    }

    // Place highlight rings on adjacent cities
    for (const adjId of adjSet) {
      const cs = this.citySprites.get(adjId);
      if (!cs) continue;
      const hl = this.scene.add
        .image(cs.screenX, cs.screenY, 'city_highlight')
        .setDepth(4)
        .setAlpha(0.6);
      cs.highlight = hl;
    }
  }
}
