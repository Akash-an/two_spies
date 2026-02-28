/**
 * Shared message types for client ↔ server communication.
 * Aligned with protocol/schemas/ and the GDD city-graph model.
 */

// ─── Enums ───────────────────────────────────────────────────────────

/** Player identifier / team colour. */
export type PlayerSide = 'RED' | 'BLUE';

/** All client → server message types. */
export enum ClientMessageType {
  CREATE_MATCH = 'CREATE_MATCH',
  JOIN_MATCH = 'JOIN_MATCH',
  PLAYER_ACTION = 'PLAYER_ACTION',
  END_TURN = 'END_TURN',
  SET_PLAYER_NAME = 'SET_PLAYER_NAME',
}

/** All server → client message types. */
export enum ServerMessageType {
  MATCH_CREATED = 'MATCH_CREATED',
  MATCH_START = 'MATCH_START',
  MATCH_STATE = 'MATCH_STATE',
  TURN_CHANGE = 'TURN_CHANGE',
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR',
  WAITING_FOR_OPPONENT = 'WAITING_FOR_OPPONENT',
}

/** Action kinds a player can perform during their turn. */
export enum ActionKind {
  MOVE = 'MOVE',
  STRIKE = 'STRIKE',
  ABILITY = 'ABILITY',
}

/** Available abilities. */
export enum AbilityId {
  DEEP_COVER = 'DEEP_COVER',
  ENCRYPTION = 'ENCRYPTION',
  LOCATE = 'LOCATE',
  STRIKE_REPORT = 'STRIKE_REPORT',
  RAPID_RECON = 'RAPID_RECON',
  PREP_MISSION = 'PREP_MISSION',
}

// ─── City Graph ──────────────────────────────────────────────────────

export interface CityDef {
  id: string;
  name: string;
  x: number;          // normalised 0-1 canvas position
  y: number;
  isBonus?: boolean;   // bonus Intel city
  isPickup?: boolean;  // pickup city
}

export interface EdgeDef {
  from: string;  // city id
  to: string;    // city id
}

export interface MapDef {
  cities: CityDef[];
  edges: EdgeDef[];
}

// ─── Player-filtered State (server → client) ────────────────────────

export interface PlayerState {
  side: PlayerSide;
  name: string;              // player-chosen name
  currentCity: string;       // only own position
  intel: number;
  actionsRemaining: number;
  hasCover: boolean;
  knownOpponentCity?: string | null;  // only if revealed
  abilities: AbilityId[];
}

export interface MatchState {
  sessionId: string;
  turnNumber: number;
  currentTurn: PlayerSide;
  player: PlayerState;
  opponentName: string;       // opponent's display name
  map: MapDef;
  gameOver: boolean;
  winner: PlayerSide | null;
}

// ─── Messages ────────────────────────────────────────────────────────

export interface ClientMessage {
  type: ClientMessageType;
  sessionId?: string;
  playerId?: string;
  payload: Record<string, unknown>;
}

export interface ServerMessage {
  type: ServerMessageType;
  sessionId?: string;
  payload: unknown;
}

// ─── Action Payloads ─────────────────────────────────────────────────

export interface MovePayload {
  action: ActionKind.MOVE;
  targetCity: string;
}

export interface StrikePayload {
  action: ActionKind.STRIKE;
  targetCity: string;
}

export interface AbilityPayload {
  action: ActionKind.ABILITY;
  abilityId: AbilityId;
  targetCity?: string;
}

export type ActionPayload = MovePayload | StrikePayload | AbilityPayload;
