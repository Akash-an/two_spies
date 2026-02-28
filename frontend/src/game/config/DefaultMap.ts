/**
 * Default map — a stylised Cold War Europe city graph.
 * Coordinates are normalised 0–1 and will be scaled to canvas size.
 * This file is the single source of map data (per AGENTS.md / GDD §11).
 */

import { MapDef } from '../../types/Messages';

export const DEFAULT_MAP: MapDef = {
  cities: [
    // Northern Europe
    { id: 'london',    name: 'London',    x: 0.22, y: 0.28, isBonus: true },
    { id: 'paris',     name: 'Paris',     x: 0.30, y: 0.42 },
    { id: 'amsterdam', name: 'Amsterdam', x: 0.35, y: 0.26 },
    { id: 'berlin',    name: 'Berlin',    x: 0.48, y: 0.28, isBonus: true },
    { id: 'copenhagen',name: 'Copenhagen',x: 0.44, y: 0.17 },

    // Central Europe
    { id: 'zurich',    name: 'Zurich',    x: 0.38, y: 0.48 },
    { id: 'vienna',    name: 'Vienna',    x: 0.52, y: 0.44, isPickup: true },
    { id: 'prague',    name: 'Prague',    x: 0.50, y: 0.36 },

    // Southern Europe
    { id: 'rome',      name: 'Rome',      x: 0.44, y: 0.62 },
    { id: 'madrid',    name: 'Madrid',    x: 0.15, y: 0.62, isBonus: true },
    { id: 'istanbul',  name: 'Istanbul',  x: 0.72, y: 0.58, isPickup: true },

    // Eastern Europe
    { id: 'warsaw',    name: 'Warsaw',    x: 0.58, y: 0.28 },
    { id: 'moscow',    name: 'Moscow',    x: 0.78, y: 0.20, isBonus: true },
    { id: 'budapest',  name: 'Budapest',  x: 0.56, y: 0.48 },
    { id: 'bucharest', name: 'Bucharest', x: 0.64, y: 0.52 },

    // Scandinavia
    { id: 'stockholm', name: 'Stockholm', x: 0.50, y: 0.10, isPickup: true },
  ],

  edges: [
    // NW cluster
    { from: 'london',    to: 'paris' },
    { from: 'london',    to: 'amsterdam' },
    { from: 'paris',     to: 'amsterdam' },
    { from: 'paris',     to: 'zurich' },
    { from: 'paris',     to: 'madrid' },
    { from: 'amsterdam', to: 'berlin' },
    { from: 'amsterdam', to: 'copenhagen' },

    // Central
    { from: 'berlin',    to: 'copenhagen' },
    { from: 'berlin',    to: 'prague' },
    { from: 'berlin',    to: 'warsaw' },
    { from: 'prague',    to: 'vienna' },
    { from: 'prague',    to: 'zurich' },
    { from: 'zurich',    to: 'rome' },
    { from: 'vienna',    to: 'budapest' },
    { from: 'vienna',    to: 'zurich' },

    // South
    { from: 'rome',      to: 'madrid' },
    { from: 'rome',      to: 'budapest' },

    // East
    { from: 'warsaw',    to: 'moscow' },
    { from: 'warsaw',    to: 'prague' },
    { from: 'budapest',  to: 'bucharest' },
    { from: 'bucharest', to: 'istanbul' },
    { from: 'budapest',  to: 'istanbul' },
    { from: 'moscow',    to: 'warsaw' },

    // Scandinavia links
    { from: 'copenhagen', to: 'stockholm' },
    { from: 'stockholm',  to: 'moscow' },
  ],
};
