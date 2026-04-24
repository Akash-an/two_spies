import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { WebSocketClient } from '../../network/WebSocketClient';
import {
  ServerMessageType,
  ClientMessageType,
  ActionKind,
  AbilityId,
  MatchState,
  GameOverPayload,
  PlayerSide,
} from '../../types/Messages';
import './PhaserGame.css';

export interface PhaserGameProps {
  operativeName: string;
  playerName: string;
  webSocketClient: WebSocketClient;
  onGameEnd?: () => void;
  onTerminateLink?: () => void;
}

type ActionMode = 'MOVE' | 'STRIKE' | null;

const PhaserGame: React.FC<PhaserGameProps> = ({
  operativeName,
  playerName: _playerName,
  webSocketClient,
  onGameEnd,
  onTerminateLink,
}) => {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [turnBanner, setTurnBanner] = useState<string | null>(null);
  const [localTimerMs, setLocalTimerMs] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTurnRef = useRef<PlayerSide | null>(null);

  const addNotification = useCallback((msg: string, type?: 'warning' | 'error') => {
    const prefix = type === 'warning' ? '⚠ ' : type === 'error' ? '✗ ' : '› ';
    setNotifications(prev => [...prev.slice(-49), prefix + msg]);
  }, []);

  // Adjacency set for the player's current city
  const adjacentCities = useMemo(() => {
    if (!matchState) return new Set<string>();
    const current = matchState.player.currentCity;
    const adj = new Set<string>();
    for (const edge of matchState.map.edges) {
      if (edge.from === current) adj.add(edge.to);
      if (edge.to === current) adj.add(edge.from);
    }
    return adj;
  }, [matchState]);

  // Set of disappeared cities
  const disappearedSet = useMemo(() => {
    if (!matchState) return new Set<string>();
    return new Set(matchState.disappearedCities);
  }, [matchState]);

  // Intel popup cities
  const intelCitySet = useMemo(() => {
    if (!matchState) return new Set<string>();
    return new Set(matchState.intelPopups.map(p => p.city));
  }, [matchState]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const handleMatchState = (msg: any) => {
      const state = msg.payload as MatchState;
      setMatchState(state);

      // Reset local timer from server elapsed
      setLocalTimerMs(state.timeElapsedMs);

      // Turn change detection
      if (lastTurnRef.current !== null && lastTurnRef.current !== state.currentTurn) {
        const isMyTurn = state.currentTurn === state.player.side;
        setTurnBanner(isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN");
        setTimeout(() => setTurnBanner(null), 2000);
        setSelectedCity(null);
        setActionMode(null);
      }
      lastTurnRef.current = state.currentTurn;

      // Process notifications from state
      if (state.player.opponentUsedStrike) {
        addNotification('Opponent attempted a STRIKE!', 'warning');
      }
      if (state.player.opponentUsedLocate) {
        addNotification('Opponent used LOCATE', 'warning');
      }
      if (state.player.opponentUsedDeepCover) {
        addNotification('Opponent activated DEEP COVER', 'warning');
      }
      if (state.player.locateBlockedByDeepCover) {
        addNotification('Your LOCATE was blocked by Deep Cover!', 'error');
      }
      if (state.player.claimedIntel) {
        addNotification('Intel claimed! (+10 Intel, cover blown)', 'warning');
      }
      if (state.isPlayerStranded) {
        addNotification('WARNING: You are in a disappearing city!', 'error');
      }
    };

    const handleGameOver = (msg: any) => {
      setGameOver(msg.payload as GameOverPayload);
      addNotification(`Game Over: ${msg.payload.winner} wins — ${msg.payload.reason}`);
    };

    const handleError = (msg: any) => {
      addNotification(msg.payload?.message || 'Unknown error', 'error');
    };

    webSocketClient.on(ServerMessageType.MATCH_STATE, handleMatchState);
    webSocketClient.on(ServerMessageType.GAME_OVER, handleGameOver);
    webSocketClient.on(ServerMessageType.ERROR, handleError);

    return () => {
      webSocketClient.off(ServerMessageType.MATCH_STATE, handleMatchState);
      webSocketClient.off(ServerMessageType.GAME_OVER, handleGameOver);
      webSocketClient.off(ServerMessageType.ERROR, handleError);
    };
  }, [webSocketClient, addNotification]);

  // Local timer tick
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLocalTimerMs(prev => prev + 200);
    }, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const isMyTurn = matchState ? matchState.currentTurn === matchState.player.side : false;
  const actionsLeft = matchState?.player.actionsRemaining ?? 0;
  const canAct = isMyTurn && actionsLeft > 0 && !gameOver;

  const sendAction = useCallback((action: string, targetCity?: string, abilityId?: string) => {
    const payload: Record<string, string> = { action };
    if (targetCity) payload.targetCity = targetCity;
    if (abilityId) payload.abilityId = abilityId;
    webSocketClient.send(ClientMessageType.PLAYER_ACTION, payload);
    setSelectedCity(null);
    setActionMode(null);
  }, [webSocketClient]);

  const sendEndTurn = useCallback(() => {
    webSocketClient.send(ClientMessageType.END_TURN, {});
  }, [webSocketClient]);

  const handleCityClick = useCallback((cityId: string) => {
    if (!canAct) return;
    if (disappearedSet.has(cityId)) return;

    if (actionMode === 'MOVE') {
      if (adjacentCities.has(cityId)) {
        sendAction(ActionKind.MOVE, cityId);
      } else {
        addNotification('Cannot move there — not adjacent', 'error');
      }
      return;
    }

    if (actionMode === 'STRIKE') {
      sendAction(ActionKind.STRIKE, cityId);
      return;
    }

    // No action mode — just select
    setSelectedCity(prev => prev === cityId ? null : cityId);
  }, [canAct, actionMode, adjacentCities, disappearedSet, sendAction, addNotification]);

  // Timer display
  const timerRemaining = matchState ? Math.max(0, matchState.turnDuration - localTimerMs) : 0;
  const timerSeconds = Math.ceil(timerRemaining / 1000);
  const timerUrgent = timerSeconds <= 5;

  // SVG viewport setup
  const SVG_W = 1000;
  const SVG_H = 600;
  const PAD = 60;

  if (!matchState) {
    return (
      <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="waiting-indicator">WAITING FOR MATCH STATE...</div>
      </div>
    );
  }

  const mySide = matchState.player.side;
  const playerCity = matchState.player.currentCity;
  const knownOpp = matchState.player.knownOpponentCity;

  // Build city coordinate map (normalised 0-1 → SVG pixels)
  const cityPos = new Map<string, { x: number; y: number }>();
  for (const c of matchState.map.cities) {
    cityPos.set(c.id, {
      x: PAD + c.x * (SVG_W - 2 * PAD),
      y: PAD + c.y * (SVG_H - 2 * PAD),
    });
  }

  return (
    <div className="game-container">
      {/* ── Header ─── */}
      <div className="game-header">
        <div className="header-left">
          <span className={`header-side ${mySide.toLowerCase()}`}>{mySide} — {operativeName}</span>
          <span className="header-turn">
            TURN {matchState.turnNumber} · {isMyTurn ? 'YOUR MOVE' : `${matchState.opponentName}'s MOVE`}
            {canAct && ` · ${actionsLeft} action${actionsLeft !== 1 ? 's' : ''} left`}
          </span>
        </div>
        <div className={`header-timer ${timerUrgent ? 'urgent' : 'normal'}`}>
          {timerSeconds}s
        </div>
      </div>

      {/* ── Body: Map + Panel ─── */}
      <div className="game-body">
        {/* Map */}
        <div className="game-map">
          {turnBanner && (
            <div className={`turn-banner ${turnBanner === 'YOUR TURN' ? 'your-turn' : 'opponent-turn'}`}>
              {turnBanner}
            </div>
          )}
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
            {/* Grid dots background */}
            <defs>
              <pattern id="grid-dots" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="0.8" fill="#00ffff" opacity="0.15" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#grid-dots)" />

            {/* Edges */}
            {matchState.map.edges.map((edge, i) => {
              const from = cityPos.get(edge.from);
              const to = cityPos.get(edge.to);
              if (!from || !to) return null;
              if (disappearedSet.has(edge.from) || disappearedSet.has(edge.to)) return null;
              const isAdj = actionMode === 'MOVE' && (
                (edge.from === playerCity && adjacentCities.has(edge.to)) ||
                (edge.to === playerCity && adjacentCities.has(edge.from))
              );
              return (
                <line
                  key={i}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  className={`city-edge ${isAdj ? 'adjacent' : ''}`}
                />
              );
            })}

            {/* Cities */}
            {matchState.map.cities.map(city => {
              const pos = cityPos.get(city.id);
              if (!pos) return null;
              const isDis = disappearedSet.has(city.id);
              const isPlayer = city.id === playerCity;
              const isOpp = city.id === knownOpp;
              const isAdj = actionMode === 'MOVE' && adjacentCities.has(city.id);
              const isSel = city.id === selectedCity;
              const isStartOwn = city.id === matchState.player.startingCity;
              const isStartOpp = city.id === matchState.player.opponentStartingCity;
              const controller = matchState.controlledCities[city.id];
              const hasIntel = intelCitySet.has(city.id);
              const scheduledDisappear = city.id === matchState.scheduledDisappearCity;

              let circleClass = 'city-circle';
              if (isDis) circleClass += ' disappeared';
              else if (isPlayer) circleClass += ' player';
              else if (isOpp) circleClass += ' opponent';
              else if (hasIntel) circleClass += ' intel-popup';
              else if (isAdj) circleClass += ' adjacent-highlight';
              else if (isSel) circleClass += ' selected';
              else circleClass += ' default';

              if (!isDis && isStartOwn) circleClass += ' starting-own';
              if (!isDis && isStartOpp) circleClass += ' starting-opp';
              if (!isDis && controller === 'RED') circleClass += ' controlled-red';
              if (!isDis && controller === 'BLUE') circleClass += ' controlled-blue';

              const radius = isPlayer || isOpp ? 10 : isAdj ? 8 : 7;

              return (
                <g key={city.id} className="city-node" onClick={() => handleCityClick(city.id)}>
                  {/* Scheduled disappear warning ring */}
                  {scheduledDisappear && !isDis && (
                    <circle cx={pos.x} cy={pos.y} r={14} fill="none" stroke="#ff6b6b" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.7" />
                  )}
                  <circle cx={pos.x} cy={pos.y} r={radius} className={circleClass} />
                  {/* Player marker */}
                  {isPlayer && (
                    <text x={pos.x} y={pos.y + 3} textAnchor="middle" fill="#0c0e0f" fontSize="10" fontWeight="bold" pointerEvents="none">★</text>
                  )}
                  {/* Opponent marker */}
                  {isOpp && (
                    <text x={pos.x} y={pos.y + 3} textAnchor="middle" fill="#0c0e0f" fontSize="10" fontWeight="bold" pointerEvents="none">✕</text>
                  )}
                  {/* Intel icon */}
                  {hasIntel && !isPlayer && !isOpp && !isDis && (
                    <text x={pos.x} y={pos.y + 3} textAnchor="middle" fill="#0c0e0f" fontSize="8" fontWeight="bold" pointerEvents="none">$</text>
                  )}
                  {/* City name */}
                  <text x={pos.x} y={pos.y + radius + 14} className={`city-label ${isDis ? 'disappeared' : ''}`}>
                    {city.name}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Action mode hint */}
          {actionMode && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(12,14,15,0.9)', border: '1px solid rgba(0,255,255,0.3)',
              padding: '6px 16px', fontSize: 12, color: '#ffd700', letterSpacing: '0.1em', zIndex: 30,
            }}>
              {actionMode === 'MOVE' ? 'SELECT AN ADJACENT CITY TO MOVE' : 'SELECT A CITY TO STRIKE'}
              <button onClick={() => setActionMode(null)} style={{
                marginLeft: 12, background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontFamily: 'inherit',
              }}>✕ CANCEL</button>
            </div>
          )}
        </div>

        {/* ── Side Panel ─── */}
        <div className="game-panel">
          <div className="panel-section">
            <div className="panel-section-title">Operative</div>
            <div className="panel-stat">
              <span>Intel</span>
              <span className="panel-stat-value intel">{matchState.player.intel}</span>
            </div>
            <div className="panel-stat">
              <span>Cover</span>
              <span className="panel-stat-value">{matchState.player.hasCover ? 'ACTIVE' : 'EXPOSED'}</span>
            </div>
            <div className="panel-stat">
              <span>Location</span>
              <span className="panel-stat-value">{matchState.map.cities.find(c => c.id === playerCity)?.name || playerCity}</span>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-title">Opponent</div>
            <div className="panel-stat">
              <span>Name</span>
              <span className="panel-stat-value">{matchState.opponentName || '???'}</span>
            </div>
            <div className="panel-stat">
              <span>Known Location</span>
              <span className="panel-stat-value">{knownOpp || 'UNKNOWN'}</span>
            </div>
            <div className="panel-stat">
              <span>Moved from start</span>
              <span className="panel-stat-value">{matchState.opponentMovedFromStart ? 'YES' : 'NO'}</span>
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-title">Abilities</div>
            {matchState.player.abilities.map(a => (
              <div key={a} style={{ fontSize: 11, padding: '2px 0', color: '#c1fffe' }}>{a.replace('_', ' ')}</div>
            ))}
            {matchState.player.abilities.length === 0 && (
              <div style={{ fontSize: 11, color: '#555' }}>No abilities available</div>
            )}
          </div>

          <div className="panel-section" style={{ flex: 1 }}>
            <div className="panel-section-title">Intel Log</div>
            <div className="notification-list">
              {notifications.length === 0 ? (
                <div style={{ opacity: 0.4 }}>&gt; AWAITING INTEL...</div>
              ) : (
                [...notifications].reverse().map((n, i) => (
                  <div key={i} className={`notification-item ${n.startsWith('⚠') ? 'warning' : n.startsWith('✗') ? 'error' : ''}`}>
                    {n}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar ─── */}
      <div className="game-actions">
        <button
          className={`action-btn ${actionMode === 'MOVE' ? 'active' : ''}`}
          disabled={!canAct}
          onClick={() => setActionMode(prev => prev === 'MOVE' ? null : 'MOVE')}
        >
          MOVE
        </button>
        <button
          className={`action-btn ${actionMode === 'STRIKE' ? 'active' : ''}`}
          disabled={!canAct}
          onClick={() => setActionMode(prev => prev === 'STRIKE' ? null : 'STRIKE')}
        >
          STRIKE
        </button>
        <button className="action-btn" disabled={!canAct} onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.LOCATE)}>
          LOCATE
        </button>
        <button className="action-btn" disabled={!canAct} onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.DEEP_COVER)}>
          DEEP COVER
        </button>
        <button className="action-btn" disabled={!canAct} onClick={() => sendAction(ActionKind.WAIT)}>
          WAIT
        </button>
        <button className="action-btn" disabled={!canAct} onClick={() => sendAction(ActionKind.CONTROL)}>
          CONTROL
        </button>
        <button className="action-btn end-turn" disabled={!isMyTurn || !!gameOver} onClick={sendEndTurn}>
          END TURN
        </button>
        <button className="action-btn terminate" onClick={onTerminateLink}>
          TERMINATE
        </button>
      </div>

      {/* ── Game Over Overlay ─── */}
      {gameOver && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <div className={`game-over-title ${gameOver.winner === mySide ? 'victory' : 'defeat'}`}>
              {gameOver.winner === mySide ? 'MISSION SUCCESSFUL' : 'MISSION FAILED'}
            </div>
            <div className="game-over-reason">{gameOver.reason}</div>
            <button className="game-over-btn" onClick={onGameEnd}>
              RETURN TO LOBBY
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhaserGame;
