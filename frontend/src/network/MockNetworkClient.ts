/**
 * MockNetworkClient — simulates server behaviour for local development.
 *
 * Implements the same event-dispatch interface as WebSocketClient so scenes
 * don't need to know whether the connection is real or mocked.
 *
 * All "server" logic lives here as simple stubs.  Replace with `WebSocketClient`
 * once the C++ backend is running.
 */

import { EventEmitter } from './EventEmitter';
import {
  ServerMessageType,
  ClientMessageType,
  ActionKind,
  MatchState,
  PlayerSide,
  PlayerState,
  AbilityId,
} from '../types/Messages';
import { DEFAULT_MAP } from '../game/config/DefaultMap';

export class MockNetworkClient extends EventEmitter {
  private sessionId = 'mock-session-001';
  private playerSide: PlayerSide = 'RED';
  private playerName = 'Agent';  // default until SET_PLAYER_NAME is received
  private state!: MatchState;
  private mockRoomCode = '';      // generated on CREATE_MATCH

  /**
   * Simulate connecting to the server. Resolves immediately.
   */
  connect(): Promise<void> {
    console.info('[MockNet] Connected (mock)');
    return Promise.resolve();
  }

  /**
   * Client sends a message. We route it to a fake handler.
   */
  send(type: string, payload: Record<string, unknown> = {}): void {
    console.info(`[MockNet] ← ${type}`, payload);

    switch (type) {
      case ClientMessageType.CREATE_MATCH:
        this.handleCreateMatch();
        break;
      case ClientMessageType.JOIN_MATCH:
        this.handleJoinMatch(payload);
        break;
      case ClientMessageType.PLAYER_ACTION:
        this.handleAction(payload);
        break;
      case ClientMessageType.END_TURN:
        this.handleEndTurn();
        break;
      case ClientMessageType.SET_PLAYER_NAME:
        this.playerName = (payload.name as string) || this.playerName;
        console.info(`[MockNet] Player name set to: ${this.playerName}`);
        // If a match is already in progress, update the state and re-emit
        if (this.state) {
          this.state.player.name = this.playerName;
          this.emitState();
        }
        break;
      default:
        console.warn(`[MockNet] Unknown client message: ${type}`);
    }
  }

  disconnect(): void {
    console.info('[MockNet] Disconnected (mock)');
  }

  // ─── mock handlers ──────────────────────────────────────────────

  /**
   * Host creates a new match. We generate a fake 4-digit code, send
   * MATCH_CREATED, then simulate an opponent joining after 3s.
   */
  private handleCreateMatch(): void {
    this.mockRoomCode = String(1000 + Math.floor(Math.random() * 9000));

    // Send the code back to the host
    setTimeout(() => {
      this.emit(ServerMessageType.MATCH_CREATED, {
        type: ServerMessageType.MATCH_CREATED,
        sessionId: this.sessionId,
        payload: { code: this.mockRoomCode },
      });
    }, 100);

    // Simulate an opponent joining after a short delay
    setTimeout(() => {
      this.initState();
      this.emit(ServerMessageType.MATCH_START, {
        type: ServerMessageType.MATCH_START,
        sessionId: this.sessionId,
        payload: { side: this.playerSide },
      });
      this.emitState();
    }, 3000);
  }

  /**
   * Joiner provides a 4-digit code. In mock mode, any code succeeds.
   */
  private handleJoinMatch(payload: Record<string, unknown>): void {
    const code = (payload.code as string) || '';
    console.info(`[MockNet] JOIN_MATCH with code: ${code}`);

    // Simulate instant match start
    setTimeout(() => {
      this.initState();
      this.emit(ServerMessageType.MATCH_START, {
        type: ServerMessageType.MATCH_START,
        sessionId: this.sessionId,
        payload: { side: this.playerSide },
      });
      this.emitState();
    }, 500);
  }

  /**
   * Build the initial match state (shared by create + join paths).
   */
  private initState(): void {
    const cities = DEFAULT_MAP.cities;
    const startIdx = Math.floor(Math.random() * cities.length);
    const startCity = cities[startIdx].id;

    const player: PlayerState = {
      side: this.playerSide,
      name: this.playerName,
      currentCity: startCity,
      intel: 2,
      actionsRemaining: 2,
      hasCover: false,
      knownOpponentCity: null,
      abilities: [AbilityId.LOCATE, AbilityId.DEEP_COVER],
      
      // New fields for opponent notifications and starting cities
      opponentUsedStrike: false,
      opponentUsedLocate: false,
      startingCity: startCity,
      opponentStartingCity: cities[(startIdx + 3) % cities.length].id, // Different city for opponent
    };

    this.state = {
      sessionId: this.sessionId,
      turnNumber: 1,
      currentTurn: 'RED',
      player,
      opponentName: 'MockOpponent',
      map: DEFAULT_MAP,
      gameOver: false,
      winner: null,
      opponentMovedFromStart: false,
      turnStartTime: 0,
      turnDuration: 15000,
      timeElapsedMs: 0,
      disappearedCities: [],
      scheduledDisappearCity: undefined,
      isPlayerStranded: false,
    };
  }

  private handleAction(payload: Record<string, unknown>): void {
    const action = payload.action as string;
    const targetCity = payload.targetCity as string | undefined;

    if (this.state.player.actionsRemaining <= 0) {
      this.emitError('No actions remaining — end your turn.');
      return;
    }

    switch (action) {
      case ActionKind.MOVE:
        this.handleMove(targetCity);
        break;
      case ActionKind.STRIKE:
        this.handleStrike(targetCity);
        break;
      case ActionKind.ABILITY:
        this.handleAbility(payload);
        break;
      default:
        this.emitError(`Unknown action: ${action}`);
    }
  }

  private handleMove(targetCity: string | undefined): void {
    if (!targetCity) {
      this.emitError('Move requires targetCity.');
      return;
    }

    // Validate adjacency
    const current = this.state.player.currentCity;
    const adjacent = this.getAdjacentCities(current);
    if (!adjacent.includes(targetCity)) {
      this.emitError(`Cannot move to ${targetCity} — not adjacent to ${current}.`);
      return;
    }

    this.state.player.currentCity = targetCity;
    this.state.player.actionsRemaining -= 1;
    this.state.player.hasCover = true;
    this.emitState();
  }

  private handleStrike(targetCity: string | undefined): void {
    if (!targetCity) {
      this.emitError('Strike requires targetCity.');
      return;
    }

    this.state.player.actionsRemaining -= 1;

    // Mock: strike always fails (opponent is never at guessed city).
    // Per new rules: a miss does NOT reveal the striker's location.
    // The opponent would receive an opponentUsedStrike notification (handled server-side).
    console.info(`[MockNet] Strike on ${targetCity} — MISS. Position NOT revealed.`);
    this.state.player.hasCover = false;
    this.emitState();
  }

  private handleAbility(payload: Record<string, unknown>): void {
    const abilityId = payload.abilityId as string | undefined;
    this.state.player.actionsRemaining -= 1;

    switch (abilityId) {
      case AbilityId.LOCATE: {
        // Reveal the mock opponent's last known city (use their starting city as a stand-in)
        const opponentCity = this.state.player.opponentStartingCity;
        this.state.player.knownOpponentCity = opponentCity;
        console.info(`[MockNet] LOCATE used — opponent spotted at ${opponentCity}`);
        break;
      }
      case AbilityId.DEEP_COVER:
        this.state.player.hasCover = true;
        console.info('[MockNet] DEEP_COVER activated — cover granted');
        break;
      default:
        console.info(`[MockNet] Ability ${abilityId ?? 'unknown'} used (stub)`);
        break;
    }

    this.emitState();
  }

  private handleEndTurn(): void {
    // Advance turn
    this.state.turnNumber += 1;
    this.state.currentTurn = this.state.currentTurn === 'RED' ? 'BLUE' : 'RED';
    this.state.player.actionsRemaining = 2;
    this.state.player.intel += 1; // base Intel income
    this.state.player.hasCover = false;

    // If it's now "opponent's turn", simulate a short delay then swap back
    if (this.state.currentTurn !== this.playerSide) {
      setTimeout(() => {
        // Simulate opponent turn: they move (so their start marker clears) and
        // occasionally use actions that trigger notifications.
        this.state.opponentMovedFromStart = true;  // opponent moved this turn
        this.state.player.opponentUsedStrike = false;  // reset any prior flags
        this.state.player.opponentUsedLocate = false;
        this.state.turnNumber += 1;
        this.state.currentTurn = this.playerSide;
        this.state.player.actionsRemaining = 2;
        this.state.player.intel += 1;
        // Clear locate reveal — opponent acted, so our knowledge is stale
        this.state.player.knownOpponentCity = null;
        this.emitState();
      }, 800);
    }

    this.emitState();
  }

  // ─── helpers ────────────────────────────────────────────────────

  private getAdjacentCities(cityId: string): string[] {
    return DEFAULT_MAP.edges
      .filter((e) => e.from === cityId || e.to === cityId)
      .map((e) => (e.from === cityId ? e.to : e.from));
  }

  private emitState(): void {
    this.emit(ServerMessageType.MATCH_STATE, {
      type: ServerMessageType.MATCH_STATE,
      sessionId: this.sessionId,
      payload: structuredClone(this.state),
    });
  }

  private emitError(message: string): void {
    this.emit(ServerMessageType.ERROR, {
      type: ServerMessageType.ERROR,
      sessionId: this.sessionId,
      payload: { message },
    });
  }
}
