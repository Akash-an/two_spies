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
  WAIT = 'WAIT',
  CONTROL = 'CONTROL',
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
  
  // Opponent action notifications
  opponentUsedStrike: boolean;   // opponent attempted strike this turn
  opponentUsedLocate: boolean;   // opponent used locate ability this turn
  opponentUsedDeepCover: boolean;  // opponent used deep cover ability this turn
  
  // Player action feedback
  locateBlockedByDeepCover: boolean;  // this player's Locate was blocked by opponent's Deep Cover
  
  // Starting positions (now shared information)
  startingCity: string;          // this player's starting city
  opponentStartingCity: string;  // opponent's starting city
}

export interface MatchState {
  sessionId: string;
  turnNumber: number;
  currentTurn: PlayerSide;
  player: PlayerState;
  opponentName: string;          // opponent's display name
  map: MapDef;
  gameOver: boolean;
  winner: PlayerSide | null;
  opponentMovedFromStart: boolean;  // true once opponent leaves their starting city
  turnStartTime: number;         // server timestamp (ms) when current turn began
  turnDuration: number;          // max turn duration in ms (default: 15000)
  scheduledDisappearCity?: string;   // city scheduled to disappear (shown during actions 4-5)
  disappearedCities: string[];   // cities that have disappeared
  isPlayerStranded: boolean;     // true if player is in the disappearing city
  timeElapsedMs: number;         // elapsed time since turn started (ms)
  controlledCities: Record<string, PlayerSide>;  // city_id -> controlling player (visible to both)
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

export interface ControlPayload {
  action: ActionKind.CONTROL;
}

export type ActionPayload = MovePayload | StrikePayload | AbilityPayload | ControlPayload;
