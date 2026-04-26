/**
 * Shared message types for client ↔ server communication.
 * Aligned with protocol/schemas/ and the backend C++ protocol.
 */

// ─── Enums ───────────────────────────────────────────────────────────

/** Player identifier / team colour. */
export type PlayerSide = 'RED' | 'BLUE';

/** All client → server message types. */
export enum ClientMessageType {
  SET_PLAYER_NAME = 'SET_PLAYER_NAME',
  CREATE_MATCH = 'CREATE_MATCH',
  JOIN_MATCH = 'JOIN_MATCH',
  PLAYER_ACTION = 'PLAYER_ACTION',
  END_TURN = 'END_TURN',
  ABORT_MATCH = 'ABORT_MATCH',
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
  x: number; // normalised 0–1
  y: number;
}

export interface EdgeDef {
  from: string;
  to: string;
}

export interface MapDef {
  cities: CityDef[];
  edges: EdgeDef[];
}

// ─── Intel Pop-up ────────────────────────────────────────────────────

export interface IntelPopup {
  city: string;   // city_id where Intel appeared
  amount: number; // Intel amount (typically 10)
}

// ─── Player-filtered State (server → client) ────────────────────────

export interface PlayerState {
  side: PlayerSide;
  name: string;
  currentCity: string;
  intel: number;
  actionsRemaining: number;
  hasCover: boolean;
  knownOpponentCity?: string | null;
  abilities: AbilityId[];
  strikeReportUnlocked: boolean;
  opponentUsedStrike: boolean;
  opponentUsedLocate: boolean;
  opponentUsedDeepCover: boolean;
  locateBlockedByDeepCover: boolean;
  claimedIntel: boolean;
  startingCity: string;
  opponentStartingCity: string;
}

export interface MatchState {
  sessionId: string;
  turnNumber: number;
  currentTurn: PlayerSide;
  player: PlayerState;
  opponentName: string;
  map?: MapDef;
  gameOver: boolean;
  winner: PlayerSide | null;
  opponentMovedFromStart: boolean;
  turnDuration: number;
  timeElapsedMs: number;
  scheduledDisappearCity?: string | null;
  disappearedCities: string[];
  isPlayerStranded: boolean;
  controlledCities: Record<string, PlayerSide>;
  intelPopups: IntelPopup[];
}

// ─── Server Messages ─────────────────────────────────────────────────

export interface ServerMessage {
  type: ServerMessageType;
  sessionId?: string;
  payload: unknown;
}

export interface MatchStartPayload {
  side: PlayerSide;
  map: MapDef;
}

export interface GameOverPayload {
  winner: PlayerSide;
  reason: string;
}

export interface TurnChangePayload {
  previousTurn: PlayerSide;
  currentTurn: PlayerSide;
  reason: string;
}

export interface ErrorPayload {
  message: string;
}

// ─── Action Payloads (client → server) ───────────────────────────────

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

export interface WaitPayload {
  action: ActionKind.WAIT;
}

export interface ControlPayload {
  action: ActionKind.CONTROL;
}

export type ActionPayload = MovePayload | StrikePayload | AbilityPayload | WaitPayload | ControlPayload;
