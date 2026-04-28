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
  MapDef,
} from '../../types/Messages';
import './PhaserGame.css';

export interface PhaserGameProps {
  operativeName: string;
  playerName: string;
  webSocketClient: WebSocketClient;
  initialMap?: MapDef;
  initialState?: MatchState | null;
  onGameEnd?: () => void;
  onTerminateLink?: () => void;
  setShowHowToPlay: (val: boolean) => void;
  setActionTooltip: (val: string | null) => void;
}

type ActionMode = 'MOVE' | 'STRIKE' | null;

interface Notification {
  id: string;
  text: string;
  type?: 'warning' | 'error';
  turn: number;
}

const PhaserGame: React.FC<PhaserGameProps> = ({
  operativeName,
  playerName: _playerName,
  webSocketClient,
  initialMap,
  initialState,
  onGameEnd,
  onTerminateLink,
  setShowHowToPlay,
  setActionTooltip,
}) => {
  const [matchState, setMatchState] = useState<MatchState | null>(initialState || null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [turnBanner, setTurnBanner] = useState<string | null>(null);
  const [eventBanners, setEventBanners] = useState<{ id: string; text: string; type?: 'warning' | 'error' }[]>([]);
  const [localTimerMs, setLocalTimerMs] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTurnRef = useRef<PlayerSide | null>(null);
  const lastStateRef = useRef<MatchState | null>(null);

  // Sync with initial state prop if it changes (e.g. first state arrives just before mount)
  useEffect(() => {
    if (initialState) {
      // Inject the map if it's missing from the state payload (it's only sent in MATCH_START)
      const state = { ...initialState };
      if (!state.map && initialMap) {
        state.map = initialMap;
      }
      setMatchState(state);
    }
  }, [initialState, initialMap]);

  const addNotification = useCallback((msg: string, type?: 'warning' | 'error', turn?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => {
      // Avoid duplicate identical messages in the same turn
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        if (last.text === msg && last.turn === (turn ?? 0)) return prev;
      }
      return [...prev.slice(-49), { id, text: msg, type, turn: turn ?? 0 }];
    });
  }, []);

  const addEventBanner = useCallback((text: string, type?: 'warning' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setEventBanners(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setEventBanners(prev => prev.filter(b => b.id !== id));
    }, 4000); // 4 seconds for event banners
  }, []);

  // Adjacency set for the player's current city
  const adjacentCities = useMemo(() => {
    const effectiveMap = matchState?.map || initialMap;
    if (!matchState || !effectiveMap) return new Set<string>();
    const current = matchState.player.currentCity;
    const adj = new Set<string>();
    for (const edge of effectiveMap.edges) {
      if (edge.from === current) adj.add(edge.to);
      if (edge.to === current) adj.add(edge.from);
    }
    return adj;
  }, [matchState, initialMap]);

  // Set of disappeared cities
  const disappearedSet = useMemo(() => {
    if (!matchState) return new Set<string>();
    return new Set(matchState.disappearedCities);
  }, [matchState]);

  // Intel popup cities
  // const intelCitySet = useMemo(() => {
  //   if (!matchState) return new Set<string>();
  //   return new Set(matchState.intelPopups.map(p => p.city));
  // }, [matchState]);

  // Subscribe to WebSocket events
  useEffect(() => {
    const handleMatchState = (msg: any) => {
      const state = msg.payload as MatchState;
      
      // Inject initial map if missing from state
      if (!state.map && initialMap) {
        state.map = initialMap;
      }
      
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
        addNotification('Opponent attempted a STRIKE!', 'warning', state.turnNumber);
      }
      if (state.player.opponentUsedLocate) {
        addNotification('Opponent used LOCATE', 'warning', state.turnNumber);
      }
      if (state.player.opponentUsedDeepCover) {
        addNotification('Opponent activated DEEP COVER', 'warning', state.turnNumber);
      }
      if (state.player.opponentUsedControl) {
        addNotification('Opponent took CONTROL of a city', 'warning', state.turnNumber);
      }
      if (state.player.opponentClaimedIntel) {
        addNotification('Opponent claimed INTEL (position revealed)', 'warning', state.turnNumber);
      }

      if (state.player.opponentUnlockedStrikeReport) {
        addNotification('Opponent unlocked STRIKE REPORT!', 'warning', state.turnNumber);
      }
      if (state.player.locateBlockedByDeepCover) {
        addNotification('Your LOCATE was blocked by Deep Cover!', 'error', state.turnNumber);
      }
      if (state.player.claimedIntel) {
        addNotification('Intel claimed! (+10 Intel, cover blown)', 'warning', state.turnNumber);
      }
      if (state.isPlayerStranded) {
        addNotification('WARNING: You are in a disappearing city!', 'error', state.turnNumber);
      }

      // Detect new city destructions
      if (lastStateRef.current) {
        // Detect important opponent events for top banner
        if (state.player.opponentUsedLocate && !lastStateRef.current.player.opponentUsedLocate) {
          addEventBanner('OPPONENT USED LOCATE', 'warning');
        }
        if (state.player.opponentUsedDeepCover && !lastStateRef.current.player.opponentUsedDeepCover) {
          addEventBanner('OPPONENT ACTIVATED DEEP COVER', 'warning');
        }
        if (state.player.opponentUnlockedStrikeReport && !lastStateRef.current.player.opponentUnlockedStrikeReport) {
          addEventBanner('OPPONENT ENABLED STRIKE REPORT', 'warning');
        }
        if (state.player.opponentUsedStrike && !lastStateRef.current.player.opponentUsedStrike) {
          addEventBanner('OPPONENT ATTEMPTED A STRIKE!', 'error');
        }
        if (state.player.opponentUsedControl && !lastStateRef.current.player.opponentUsedControl) {
          addEventBanner('OPPONENT TOOK CONTROL OF A CITY', 'warning');
        }

        // Detect player strike report unlock
        if (state.player.strikeReportUnlocked && !lastStateRef.current.player.strikeReportUnlocked) {
          addNotification('STRIKE REPORT activated: You will now be notified of all opponent strike attempts.', undefined, state.turnNumber);
        }

        const oldDis = new Set(lastStateRef.current.disappearedCities);
        for (const c of state.disappearedCities) {
          if (!oldDis.has(c)) {
            const cityName = state.map?.cities.find(city => city.id === c)?.name || c;
            addNotification(`City destroyed: ${cityName}`, 'error', state.turnNumber);
          }
        }

        // Detect new intel spawns
        const oldIntel = new Set(lastStateRef.current.intelPopups.map(p => p.city));
        for (const p of state.intelPopups) {
          if (!oldIntel.has(p.city)) {
            const cityName = state.map?.cities.find(city => city.id === p.city)?.name || p.city;
            addNotification(`Intel detected: ${cityName}`, 'warning', state.turnNumber);
          }
        }
      }

      lastStateRef.current = state;
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
  }, [webSocketClient, addNotification, initialMap]);

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

  useEffect(() => {
    if (matchState) {
      console.log('[PhaserGame] State update:', {
        side: matchState.player.side,
        currentTurn: matchState.currentTurn,
        actionsLeft: matchState.player.actionsRemaining,
        isMyTurn,
        canAct,
        gameOver: !!gameOver
      });
    }
  }, [matchState, isMyTurn, actionsLeft, canAct, gameOver]);

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
      // Strike should target current location per GDD
      sendAction(ActionKind.STRIKE, playerCity);
      setActionMode(null);
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
  const SVG_W = 1376;
  const SVG_H = 768;
  const PAD = 0; // Map directly to image pixels (normalized 0-1)

  if (!matchState) {
    return (
      <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="waiting-indicator">WAITING FOR MATCH STATE...</div>
      </div>
    );
  }

  const mySide = matchState.player.side;
  const playerCity = matchState.player.currentCity;
  let knownOpp = matchState.player.knownOpponentCity;
  if (!knownOpp && !matchState.opponentMovedFromStart) {
    knownOpp = matchState.player.opponentStartingCity;
  }
  
  // Safe access to map (either from state or props)
  const map = matchState.map || initialMap;
  if (!map) {
      return (
        <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="waiting-indicator">INITIALIZING MAP DATA...</div>
        </div>
      );
  }

  const knownOppName = map.cities.find(c => c.id === knownOpp)?.name || knownOpp || 'UNKNOWN';

  // Build city coordinate map (normalised 0-1 → SVG pixels)
  const cityPos = new Map<string, { x: number; y: number }>();
  for (const c of map.cities) {
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
        <button
          className="help-btn-header"
          onClick={() => setShowHowToPlay(true)}
          onMouseEnter={() => setActionTooltip('HOW TO PLAY: Open field manual and mission objectives.')}
          onMouseLeave={() => setActionTooltip(null)}
          title="How to Play"
        >
          <span className="material-symbols-outlined">help_outline</span>
        </button>
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
          <div className="event-banners-container">
            {eventBanners.map(banner => (
              <div key={banner.id} className={`event-banner ${banner.type || ''}`}>
                <span className="material-symbols-outlined">
                  {banner.type === 'error' ? 'priority_high' : 'notifications_active'}
                </span>
                {banner.text}
              </div>
            ))}
          </div>
          <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet">
            {/* Aegis Terminal Background Map */}
            <image href="/assets/plain-map.png" width={SVG_W} height={SVG_H} opacity="0.8" />
            
            {/* Grid dots background overlay */}
            <defs>
              <pattern id="grid-dots" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="0.8" fill="#00ffff" opacity="0.1" />
              </pattern>
            </defs>
            <rect width={SVG_W} height={SVG_H} fill="url(#grid-dots)" pointerEvents="none" />

            {/* Edges */}
            {map.edges.map((edge, i) => {
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
            {map.cities.map(city => {
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
              const intelPopup = matchState.intelPopups.find(p => p.city === city.id);
              const hasIntel = !!intelPopup;
              const scheduledDisappear = city.id === matchState.scheduledDisappearCity;

              let circleClass = 'city-circle';
              if (isDis) circleClass += ' disappeared';
              else if (isPlayer) circleClass += matchState.player.hasCover ? ' player' : ' player exposed';
              else if (isOpp) circleClass += ' opponent';
              else if (hasIntel) circleClass += ' intel-popup';
              else if (isAdj) circleClass += ' adjacent-highlight';
              else if (isSel) circleClass += ' selected';
              else circleClass += ' default';

              if (!isDis && isStartOwn) circleClass += ' starting-own';
              if (!isDis && isStartOpp) circleClass += ' starting-opp';
              
              const isMyControl = controller === mySide;
              const isOppControl = controller && controller !== mySide;
              if (!isDis && isMyControl) circleClass += ' controlled-mine';
              if (!isDis && isOppControl) circleClass += ' controlled-opp';

              const radius = isPlayer || isOpp ? 16 : isAdj ? 14 : 12;

              return (
                <g key={city.id} className="city-node" onClick={() => handleCityClick(city.id)}>
                  {intelPopup && <title>{intelPopup.amount} Intel Available</title>}
                  {/* Scheduled disappear warning ring */}
                  {scheduledDisappear && !isDis && (
                    <circle cx={pos.x} cy={pos.y} r={14} className="scheduled-ring" />
                  )}
                  {/* Intel ripple animation */}
                  {hasIntel && !isPlayer && !isOpp && !isDis && (
                    <circle cx={pos.x} cy={pos.y} r={radius} fill="none" stroke="#fe9800" className="intel-ripple" pointerEvents="none" />
                  )}
                  <circle cx={pos.x} cy={pos.y} r={radius} className={circleClass} />
                  
                  {/* Disappeared overlay (X) */}
                  {isDis && (
                    <>
                      <line x1={pos.x - 6} y1={pos.y - 6} x2={pos.x + 6} y2={pos.y + 6} stroke="#ff4444" strokeWidth="2" />
                      <line x1={pos.x + 6} y1={pos.y - 6} x2={pos.x - 6} y2={pos.y + 6} stroke="#ff4444" strokeWidth="2" />
                    </>
                  )}

                  {/* Player & Opponent Markers (Pointer Style) */}
                  {(() => {
                    const markers = [];
                    const markerW = 16;
                    const markerH = 28;
                    const shoulderH = 20; // Widest part is now near the top
                    const tipY = pos.y - radius - 1;
                    const isExposed = isPlayer && !matchState.player.hasCover;
                    
                    if (isPlayer && isOpp) {
                      // Both players in same city - offset side-by-side
                      const p1X = pos.x - 10;
                      const p2X = pos.x + 10;
                      markers.push(
                        <polygon 
                          key="player"
                          points={`${p1X},${tipY} ${p1X + markerW/2},${tipY - shoulderH} ${p1X},${tipY - markerH} ${p1X - markerW/2},${tipY - shoulderH}`} 
                          fill="#10b981" 
                          stroke={isExposed ? "#fff" : "none"}
                          strokeWidth={isExposed ? "2" : "0"}
                          pointerEvents="none" 
                          className={`marker-float ${isExposed ? 'exposed-glow' : ''}`}
                        />
                      );
                      markers.push(
                        <polygon 
                          key="opponent"
                          points={`${p2X},${tipY} ${p2X + markerW/2},${tipY - shoulderH} ${p2X},${tipY - markerH} ${p2X - markerW/2},${tipY - shoulderH}`} 
                          fill="#ff4444" 
                          pointerEvents="none" 
                          className="marker-float"
                        />
                      );
                    } else if (isPlayer) {
                      markers.push(
                        <polygon 
                          key="player"
                          points={`${pos.x},${tipY} ${pos.x + markerW/2},${tipY - shoulderH} ${pos.x},${tipY - markerH} ${pos.x - markerW/2},${tipY - shoulderH}`} 
                          fill="#10b981" 
                          stroke={isExposed ? "#fff" : "none"}
                          strokeWidth={isExposed ? "2" : "0"}
                          pointerEvents="none" 
                          className={`marker-float ${isExposed ? 'exposed-glow' : ''}`}
                        />
                      );
                    } else if (isOpp) {
                      markers.push(
                        <polygon 
                          key="opponent"
                          points={`${pos.x},${tipY} ${pos.x + markerW/2},${tipY - shoulderH} ${pos.x},${tipY - markerH} ${pos.x - markerW/2},${tipY - shoulderH}`} 
                          fill="#ff4444" 
                          pointerEvents="none" 
                          className="marker-float"
                        />
                      );
                    }
                    return markers;
                  })()}

                  {/* Intel points display (now always visible as markers are above) */}
                  {hasIntel && !isDis && (
                    <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#0c0e0f" fontSize="10" fontWeight="900" pointerEvents="none">
                      {intelPopup.amount}
                    </text>
                  )}
                  {/* City name */}
                  <text x={pos.x} y={pos.y + radius + 18} className={`city-label ${isDis ? 'disappeared' : ''}`}>
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
              {actionMode === 'MOVE' ? 'SELECT AN ADJACENT CITY TO MOVE' : 'READY TO STRIKE CURRENT LOCATION'}
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
              <span className="panel-stat-value">{map.cities.find(c => c.id === playerCity)?.name || playerCity}</span>
            </div>
            <div className="panel-stat" title="Monitors opponent strike attempts">
              <span>Strike Report</span>
              <span className={`panel-stat-value ${matchState.player.strikeReportUnlocked ? '' : 'dimmed'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                  {matchState.player.strikeReportUnlocked ? 'security' : 'shield'}
                </span>
                {matchState.player.strikeReportUnlocked ? 'ACTIVE' : 'OFFLINE'}
              </span>
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
              <span className="panel-stat-value">{knownOppName}</span>
            </div>
            <div className="panel-stat" title="Monitors your strike attempts">
              <span>Strike Report</span>
              <span className={`panel-stat-value ${matchState.player.opponentStrikeReportActive ? 'active-warn' : 'dimmed'}`}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                  {matchState.player.opponentStrikeReportActive ? 'security' : 'shield'}
                </span>
                {matchState.player.opponentStrikeReportActive ? 'ACTIVE' : 'OFFLINE'}
              </span>
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
                [...notifications].reverse().map((n, i) => {
                  const isLatest = i === 0;
                  const isIrrelevant = n.turn < matchState.turnNumber;
                  const prefix = n.type === 'warning' ? '⚠ ' : n.type === 'error' ? '✗ ' : '› ';
                  return (
                    <div 
                      key={n.id} 
                      className={`notification-item ${n.type || ''} ${isLatest ? 'latest' : ''} ${isIrrelevant ? 'irrelevant' : ''}`}
                    >
                      {isLatest && <span className="latest-tag">NEW</span>}
                      <span className="notification-turn">T{n.turn}</span> {prefix}{n.text}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar ─── */}
      <div className="game-actions">
        <div onMouseEnter={() => setActionTooltip('MOVE: Travel to an adjacent connected city. Grants Cover.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className={`action-btn ${actionMode === 'MOVE' ? 'active' : ''}`}
            disabled={!canAct}
            onClick={() => setActionMode(actionMode === 'MOVE' ? null : 'MOVE')}
          >
            <span className="material-symbols-outlined">directions_run</span>
            <span className="btn-label">MOVE</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('WAIT: Stay put and regain Cover (unless in enemy territory).')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canAct}
            onClick={() => sendAction(ActionKind.WAIT)}
          >
            <span className="material-symbols-outlined">hourglass_empty</span>
            <span className="btn-label">WAIT</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('STRIKE: Attack the opponent at your current location. Reveals you ONLY if opponent has Strike Report.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canAct}
            onClick={() => {
              sendAction(ActionKind.STRIKE, playerCity);
            }}
          >
            <span className="material-symbols-outlined">ads_click</span>
            <span className="btn-label">STRIKE</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('CONTROL: Claim this city for your network. Blows Cover.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canAct}
            onClick={() => sendAction(ActionKind.CONTROL)}
          >
            <span className="material-symbols-outlined">token</span>
            <span className="btn-label">CONTROL</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip("LOCATE: Reveal the opponent's current city. Costs 10 Intel.")} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canAct || matchState.player.intel < 10}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.LOCATE)}
          >
            <span className="material-symbols-outlined">my_location</span>
            <span className="btn-label">LOCATE</span>
            <span className="btn-cost">10</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('DEEP COVER: Hide from Locate attempts and enter opponent-controlled cities safely. Costs 30 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canAct || matchState.player.intel < 30}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.DEEP_COVER)}
          >
            <span className="material-symbols-outlined">visibility_off</span>
            <span className="btn-label">DEEP COVER</span>
            <span className="btn-cost">30</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('STRIKE REPORT: Reveal the opponent\'s location if they attempt a strike. Costs 20 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canAct || matchState.player.intel < 20 || matchState.player.strikeReportUnlocked}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.STRIKE_REPORT)}
          >
            <span className="material-symbols-outlined">plagiarism</span>
            <span className="btn-label">{matchState.player.strikeReportUnlocked ? 'REPORT ACTIVE' : 'STRIKE REPORT'}</span>
            {!matchState.player.strikeReportUnlocked && <span className="btn-cost">20</span>}
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('END TURN: Pass control to the opponent. Gain +4 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn end-turn"
            disabled={!isMyTurn || !!gameOver}
            onClick={sendEndTurn}
          >
            <span className="material-symbols-outlined">done_all</span>
            <span className="btn-label">END TURN</span>
          </button>
        </div>
        <div className="action-divider"></div>
        <div onMouseEnter={() => setActionTooltip('ABORT: Terminate current mission and return to lobby.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn terminate"
            onClick={onTerminateLink}
          >
            <span className="material-symbols-outlined">power_settings_new</span>
            <span className="btn-label">ABORT</span>
          </button>
        </div>
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
