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
const COL_EDGE = 0x334466;
const COL_EDGE_ADJACENT = 0x88ccff;
const COL_CITY_LABEL = '#cccce0';
const COL_CITY_LABEL_CURRENT = '#e0c872';

export interface CitySprite {
  id: string;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  highlight?: Phaser.GameObjects.Image;
  screenX: number;
  screenY: number;
}

export class BoardRenderer {
  private scene: Phaser.Scene;
  private edgeGraphics!: Phaser.GameObjects.Graphics;
  private citySprites: Map<string, CitySprite> = new Map();
  private spyMarker!: Phaser.GameObjects.Image;

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
    this.drawEdges(map.edges, map.cities);

    // Draw city nodes
    for (const city of map.cities) {
      this.drawCity(city, state);
    }

    // Player spy marker
    const playerCity = this.citySprites.get(state.player.currentCity);
    this.spyMarker = this.scene.add
      .image(playerCity?.screenX ?? 0, playerCity?.screenY ?? 0, 'spy_marker')
      .setDepth(10);

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

    this.highlightAdjacent(state.player.currentCity, state.map);
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

  private drawEdges(edges: EdgeDef[], cities: CityDef[]): void {
    const lookup = new Map<string, CityDef>();
    for (const c of cities) lookup.set(c.id, c);

    this.edgeGraphics.lineStyle(2, COL_EDGE, 0.5);
    for (const e of edges) {
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

  private drawCity(city: CityDef, _state: MatchState): void {
    const pos = this.toScreen(city.x, city.y);

    let textureKey = 'city';
    if (city.isBonus) textureKey = 'city_bonus';
    else if (city.isPickup) textureKey = 'city_pickup';

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

    this.citySprites.set(city.id, {
      id: city.id,
      sprite,
      label,
      screenX: pos.x,
      screenY: pos.y,
    });
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

      this.edgeGraphics.lineStyle(isAdj ? 2 : 1, isAdj ? COL_EDGE_ADJACENT : COL_EDGE, isAdj ? 0.8 : 0.3);
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
