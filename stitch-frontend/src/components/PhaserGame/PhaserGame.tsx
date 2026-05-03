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
import { audioManager } from '../../audio/AudioManager';
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
  isMuted: boolean;
  onToggleMute: () => void;
}

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
  isMuted,
  onToggleMute,
}) => {
  const [matchState, setMatchState] = useState<MatchState | null>(initialState || null);
  const mySide = matchState?.player.side;
  const playerCity = matchState?.player.currentCity || null;
  const isMyTurn = matchState ? matchState.currentTurn === mySide : false;
  const actionsLeft = matchState?.player.actionsRemaining ?? 0;
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [highlightedCity, setHighlightedCity] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [eventBanners, setEventBanners] = useState<{ id: string; text: string; type?: 'warning' | 'error' }[]>([]);
  const [localTimerMs, setLocalTimerMs] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canAct = isMyTurn && actionsLeft > 0 && !gameOver;
  // When a city is selected, all action buttons are locked — only map clicks are active
  const canActBtn = canAct && !selectedCity;
  const isCityControlledByMe = matchState && playerCity ? matchState.controlledCities[playerCity] === mySide : false;
  const isOpponentLocated = !!matchState?.player.knownOpponentCity;
  const lastTurnRef = useRef<PlayerSide | null>(null);
  const lastStateRef = useRef<MatchState | null>(null);

  // Initial check for viewport
  const SVG_W = 1376;
  const SVG_H = 768;
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: SVG_W, h: SVG_H });
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(window.innerWidth < 600);
  const isMobileViewport = window.innerWidth < 600;
  const isDragging = useRef(false);
  const isPinching = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef(0);
  const lastTouchCenter = useRef({ x: 0, y: 0 });

  const toggleMute = useCallback(() => {
    onToggleMute();
  }, [onToggleMute]);

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
  const playerAdjacentCities = useMemo(() => {
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

  // Adjacency set for the currently highlighted city (any city on the map)
  const highlightedNeighbors = useMemo(() => {
    const playerIsStranded = playerCity && disappearedSet.has(playerCity);
    if (!(highlightedCity || playerIsStranded) || !playerCity) return new Set<string>();
    const center = playerCity;
    const effectiveMap = matchState?.map || initialMap;
    if (!effectiveMap) return new Set<string>();
    const adj = new Set<string>();
    for (const edge of effectiveMap.edges) {
      if (edge.from === center) adj.add(edge.to);
      if (edge.to === center) adj.add(edge.from);
    }
    return adj;
  }, [highlightedCity, playerCity, matchState, initialMap, disappearedSet]);



  // Build city coordinate map (normalised 0-1 → SVG pixels)
  const cityPos = useMemo(() => {
    const map = matchState?.map || initialMap;
    if (!map) return new Map<string, { x: number; y: number }>();
    const posMap = new Map<string, { x: number; y: number }>();
    for (const c of map.cities) {
      posMap.set(c.id, {
        x: c.x * SVG_W,
        y: c.y * SVG_H,
      });
    }
    return posMap;
  }, [matchState?.map, initialMap]);

  const handleRecenter = useCallback(() => {
    if (playerCity && cityPos.has(playerCity)) {
      const pos = cityPos.get(playerCity)!;
      setViewBox(prev => ({
        ...prev,
        x: pos.x - prev.w / 2,
        y: pos.y - prev.h / 2,
      }));
    } else {
      // Default center
      setViewBox({ x: 0, y: 0, w: SVG_W, h: SVG_H });
    }
  }, [playerCity, cityPos, SVG_W, SVG_H]);

  // Auto-center on player city on mobile when it changes or on mount
  useEffect(() => {
    if (window.innerWidth < 600) {
      handleRecenter();
    }
  }, [playerCity, handleRecenter]);

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
        if (isMyTurn) {
          audioManager.play('turn_start');
        }
        const bannerId = `turn-${Date.now()}`;
        const bannerText = isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN";
        setEventBanners(prev => [...prev, { id: bannerId, text: bannerText }]);
        setTimeout(() => setEventBanners(prev => prev.filter(b => b.id !== bannerId)), 2000);
        setSelectedCity(null);
        setHighlightedCity(null);
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
      if (state.player.opponentUsedEncryption) {
        addNotification('Opponent activated ENCRYPTION (blackout enabled)', 'warning', state.turnNumber);
      }
      if (state.player.opponentUsedPrepMission) {
        addNotification('Opponent used PREP MISSION (extra action incoming)', 'warning', state.turnNumber);
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
        if (state.player.opponentUsedEncryption && !lastStateRef.current.player.opponentUsedEncryption) {
          addEventBanner('OPPONENT ACTIVATED ENCRYPTION', 'warning');
        }
        if (state.player.opponentUsedPrepMission && !lastStateRef.current.player.opponentUsedPrepMission) {
          addEventBanner('OPPONENT USED PREP MISSION', 'warning');
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
      audioManager.play('success'); // General notification for game over
    };

    const handleError = (msg: any) => {
      addNotification(msg.payload?.message || 'Unknown error', 'error');
      audioManager.play('error');
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
    audioManager.play('ui_click');
    const payload: Record<string, string> = { action };
    if (targetCity) payload.targetCity = targetCity;
    if (abilityId) payload.abilityId = abilityId;
    webSocketClient.send(ClientMessageType.PLAYER_ACTION, payload);
    setSelectedCity(null);
    setHighlightedCity(null);
    setActionTooltip(null);
  }, [webSocketClient, setActionTooltip]);

  const sendEndTurn = useCallback(() => {
    audioManager.play('ui_click');
    webSocketClient.send(ClientMessageType.END_TURN, {});
    setActionTooltip(null);
  }, [webSocketClient, setActionTooltip]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        const orientation = screen.orientation as any;
        if (orientation && orientation.lock) {
          await orientation.lock('landscape').catch(() => {});
        }
      } else {
        const orientation = screen.orientation as any;
        if (orientation && orientation.unlock) {
          orientation.unlock();
        }
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  const handleMapClick = useCallback(() => {
    if (isDragging.current) return;
    if (!playerCity) return;
    audioManager.play('ui_hover');
    if (highlightedCity === playerCity) {
      setHighlightedCity(null);
      setSelectedCity(null);
    } else {
      setHighlightedCity(playerCity);
      setSelectedCity(null);
    }
  }, [highlightedCity, playerCity]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = false;
    lastPos.current = { x: e.clientX, y: e.clientY };
    window.addEventListener('mousemove', handleMouseMove as any);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDragging.current = true;
    }

    if (isDragging.current) {
      const scale = viewBox.w / window.innerWidth;
      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx * scale,
        y: prev.y - dy * scale,
      }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove as any);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // Touch handlers for multi-touch (pinch) and panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = false;
      isPinching.current = false;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      isPinching.current = true;
      isDragging.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      lastTouchDist.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchCenter.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && !isPinching.current) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDragging.current = true;
      }

      if (isDragging.current) {
        const scale = viewBox.w / window.innerWidth;
        setViewBox(prev => ({
          ...prev,
          x: prev.x - dx * scale,
          y: prev.y - dy * scale,
        }));
        lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    } else if (e.touches.length === 2) {
      e.preventDefault(); // Prevent browser zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const center = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
      };

      if (lastTouchDist.current > 0) {
        const zoomRatio = lastTouchDist.current / dist;
        const newW = Math.min(SVG_W * 2, Math.max(SVG_W / 4, viewBox.w * zoomRatio));
        const newH = newW * (SVG_H / SVG_W);

        // Adjust X/Y to zoom towards center point
        // Calculate SVG coordinates of the touch center
        const svgRect = e.currentTarget.getBoundingClientRect();
        const svgCenterX = ((center.x - svgRect.left) / svgRect.width) * viewBox.w + viewBox.x;
        const svgCenterY = ((center.y - svgRect.top) / svgRect.height) * viewBox.h + viewBox.y;

        const newX = svgCenterX - ((center.x - svgRect.left) / svgRect.width) * newW;
        const newY = svgCenterY - ((center.y - svgRect.top) / svgRect.height) * newH;

        setViewBox({
          x: newX,
          y: newY,
          w: newW,
          h: newH
        });
      }

      lastTouchDist.current = dist;
      lastTouchCenter.current = center;
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    isPinching.current = false;
    lastTouchDist.current = 0;
  };

  const handleCityClick = useCallback((cityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canAct) return;
    if (disappearedSet.has(cityId)) return;

    // If clicking the already selected movement target, execute MOVE
    if (highlightedCity === cityId && selectedCity === cityId) {
      sendAction(ActionKind.MOVE, cityId);
      return;
    }

    // Toggle highlight: if already highlighted, clear it; else, highlight this city.
    if (highlightedCity === cityId) {
      setHighlightedCity(null);
      setSelectedCity(null);
    } else {
      setHighlightedCity(cityId);
      // Only set selectedCity if it's a valid move target (adjacent to player)
      // and NOT the player's own city
      if (playerAdjacentCities.has(cityId) && cityId !== playerCity) {
        setSelectedCity(cityId);
      } else {
        setSelectedCity(null);
      }
    }
  }, [canAct, playerAdjacentCities, playerCity, disappearedSet, sendAction, highlightedCity, selectedCity]);

  // Timer display
  const timerRemaining = matchState ? Math.max(0, matchState.turnDuration - localTimerMs) : 0;
  const timerSeconds = Math.ceil(timerRemaining / 1000);
  const timerUrgent = timerSeconds <= 5;


  if (!matchState) {
    return (
      <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="waiting-indicator">WAITING FOR MATCH STATE...</div>
      </div>
    );
  }

  const mySideVal = matchState.player.side;
  const knownOpp = matchState.player.knownOpponentCity;

  // Safe access to map (either from state or props)
  const map = matchState.map || initialMap;
  if (!map) {
    return (
      <div className="game-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="waiting-indicator">INITIALIZING MAP DATA...</div>
      </div>
    );
  }


  return (
    <div className="game-container">
      {/* ── Header ─── */}
      <div className="game-header">
        <div className="header-left">
          <span className="header-agent">AGENT {operativeName.replace(/^OPERATIVE_/, '')}</span>
          <span className="header-turn">
            TURN {matchState.turnNumber}
          </span>
        </div>
        <div className="header-center">
          <div className={`turn-status ${isMyTurn ? 'your-turn' : 'opponent-turn'}`}>
            {isMyTurn ? 'YOUR MOVE' : `${matchState.opponentName.replace(/^(OPERATIVE|AGENT)_/i, '').toUpperCase()}'S MOVE`}
          </div>
          {canAct && (
            <div className="actions-count">
              {actionsLeft} ACTION{actionsLeft !== 1 ? 'S' : ''} REMAINING
            </div>
          )}
        </div>
        <div className="header-right">
          <div className={`header-timer ${timerUrgent ? 'urgent' : 'normal'}`}>
            {timerSeconds}s
          </div>
          <button
            className="help-btn-header"
            onClick={toggleMute}
            onMouseEnter={() => setActionTooltip('TOGGLE AUDIO: Mute or unmute game sounds.')}
            onMouseLeave={() => setActionTooltip(null)}
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            <span className="material-symbols-outlined">
              {isMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
          <button
            className="help-btn-header"
            onClick={toggleFullscreen}
            onMouseEnter={() => setActionTooltip('FULLSCREEN: Expand tactical view.')}
            onMouseLeave={() => setActionTooltip(null)}
            title="Toggle Fullscreen"
          >
            <span className="material-symbols-outlined">
              {document.fullscreenElement ? 'screen_rotation' : 'fullscreen'}
            </span>
          </button>
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
      </div>

      {/* ── Body: Map + Panel ─── */}
      <div className="game-body">
        {/* Map */}
        <div className="game-map">
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
          <svg
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            preserveAspectRatio="xMidYMid meet"
            onClick={handleMapClick}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ cursor: isDragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
          >
            {/* Aegis Terminal Background Map */}
            <image href="/assets/plain-map.png" width={SVG_W} height={SVG_H} opacity="0.8" />

            {/* Grid dots background overlay */}
            <defs>
              <pattern id="grid-dots" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="0.8" fill="#00ffff" opacity="0.1" />
              </pattern>
            </defs>
            {/* Transparent background rect to catch deselect clicks on empty map areas */}
            <rect width={SVG_W} height={SVG_H} fill="transparent" onClick={handleMapClick} />
            <rect width={SVG_W} height={SVG_H} fill="url(#grid-dots)" pointerEvents="none" />

            {/* Edges */}
            {map.edges.map((edge, i) => {
              const from = cityPos.get(edge.from);
              const to = cityPos.get(edge.to);
              if (!from || !to) return null;
              
              const fromDis = disappearedSet.has(edge.from);
              const toDis = disappearedSet.has(edge.to);
              
              const playerIsStranded = playerCity && disappearedSet.has(playerCity);
              const isEscapeRoute = playerIsStranded && 
                ((edge.from === playerCity && !toDis) || (edge.to === playerCity && !fromDis));
                
              const isRegularAdj = !fromDis && !toDis && highlightedCity && playerCity && 
                (edge.from === playerCity || edge.to === playerCity);

              const isAdj = isEscapeRoute || isRegularAdj;
              const isDis = (fromDis || toDis) && !isAdj;

              return (
                <line
                  key={i}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  className={`city-edge ${isAdj ? 'adjacent' : ''} ${isDis ? 'disappeared' : ''}`}
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
              // Highlight city if it is a neighbor of the highlighted city
              const isAdj = highlightedNeighbors.has(city.id);
              const isSel = highlightedCity && (city.id === playerCity); // Vicinity center highlight
              const isMoveTarget = selectedCity === city.id;
              const controller = matchState.controlledCities[city.id];
              const intelPopup = matchState.intelPopups.find(p => p.city === city.id);
              const hasIntel = !!intelPopup;
              const actionPopup = (matchState.actionPopups || []).find(p => p.city === city.id);
              const hasAction = !!actionPopup;
              const scheduledDisappear = city.id === matchState.scheduledDisappearCity;

              let circleClass = 'city-circle';
              if (isDis) {
                circleClass += ' disappeared';
              } else {
                // Determine presence and state
                if (isPlayer) {
                  circleClass += matchState.player.coverStatus === 'EXPOSED' ? ' player exposed' : ' player';
                } else if (isOpp) {
                  circleClass += ' opponent';
                }

                // If no player/opponent presence, show city type/highlight
                if (!isPlayer && !isOpp) {
                  if (hasIntel) circleClass += ' intel-popup';
                  else if (hasAction) circleClass += ' action-popup';
                  else if (isMoveTarget) circleClass += ' selected';
                  else if (isAdj) circleClass += ' adjacent-highlight';
                  else if (isSel) circleClass += ' inspected';
                  else circleClass += ' default';
                }

                // Add control status (additive)
                const isMyControl = controller === mySideVal;
                const isOppControl = controller && controller !== mySideVal;
                if (isMyControl) circleClass += ' controlled-mine';
                if (isOppControl) circleClass += ' controlled-opp';
              }

              const radius = isPlayer || isOpp ? 16 : isAdj ? 14 : 12;

              return (
                <g key={city.id} className="city-node" onClick={(e) => handleCityClick(city.id, e)}>
                  {intelPopup && <title>{intelPopup.amount} Intel Available</title>}
                  {actionPopup && <title>Action Pickup — +1 Action</title>}
                  {/* Scheduled disappear warning ring */}
                  {scheduledDisappear && !isDis && (
                    <circle cx={pos.x} cy={pos.y} r={radius + 2} className="scheduled-ring" />
                  )}
                  {/* Intel ripple animation */}
                  {hasIntel && !isPlayer && !isOpp && !isDis && (
                    <circle cx={pos.x} cy={pos.y} r={radius} fill="none" stroke="#fe9800" className="intel-ripple" pointerEvents="none" />
                  )}
                  {/* Action popup ripple animation */}
                  {hasAction && !isPlayer && !isOpp && !isDis && (
                    <circle cx={pos.x} cy={pos.y} r={radius} fill="none" stroke="#00ffff" className="intel-ripple" pointerEvents="none" />
                  )}
                  <circle cx={pos.x} cy={pos.y} r={radius} className={circleClass} />
                  {/* Invisible larger hit area for touch optimization */}
                  <circle cx={pos.x} cy={pos.y} r={Math.max(radius, 24)} fill="transparent" />

                  {/* Disappeared overlay (X) */}
                  {isDis && (
                    <g opacity="0.6">
                      <line x1={pos.x - 8} y1={pos.y - 8} x2={pos.x + 8} y2={pos.y + 8} stroke="#ff4444" strokeWidth="3" strokeLinecap="round" />
                      <line x1={pos.x + 8} y1={pos.y - 8} x2={pos.x - 8} y2={pos.y + 8} stroke="#ff4444" strokeWidth="3" strokeLinecap="round" />
                    </g>
                  )}

                  {/* Player & Opponent Markers (Pointer Style) */}
                  {(() => {
                    const markers = [];
                    const markerW = 16;
                    const markerH = 28;
                    const shoulderH = 20; // Widest part is now near the top
                    const tipY = pos.y - radius - 1;
                    const isPlayerExposed = isPlayer && matchState.player.coverStatus === 'EXPOSED';

                    if (isPlayer && isOpp) {
                      // Both players in same city - offset side-by-side
                      const p1X = pos.x - 10;
                      const p2X = pos.x + 10;
                      markers.push(
                        <polygon
                          key="player"
                          points={`${p1X},${tipY} ${p1X + markerW / 2},${tipY - shoulderH} ${p1X},${tipY - markerH} ${p1X - markerW / 2},${tipY - shoulderH}`}
                          fill="var(--player-green)"
                          stroke={isPlayerExposed ? "#fff" : "none"}
                          strokeWidth={isPlayerExposed ? "2" : "0"}
                          pointerEvents="none"
                          className={`marker-float ${isPlayerExposed ? 'exposed-glow' : ''}`}
                        />
                      );
                      markers.push(
                        <g key="opponent">
                          <polygon
                            points={`${p2X},${tipY} ${p2X + markerW / 2},${tipY - shoulderH} ${p2X},${tipY - markerH} ${p2X - markerW / 2},${tipY - shoulderH}`}
                            fill="#ff4444"
                            stroke="none"
                            strokeWidth="0"
                            pointerEvents="none"
                            className="marker-float"
                          />
                        </g>
                      );
                    } else if (isPlayer) {
                      markers.push(
                        <polygon
                          key="player"
                          points={`${pos.x},${tipY} ${pos.x + markerW / 2},${tipY - shoulderH} ${pos.x},${tipY - markerH} ${pos.x - markerW / 2},${tipY - shoulderH}`}
                          fill="var(--player-green)"
                          stroke={isPlayerExposed ? "#fff" : "none"}
                          strokeWidth={isPlayerExposed ? "2" : "0"}
                          pointerEvents="none"
                          className={`marker-float ${isPlayerExposed ? 'exposed-glow' : ''}`}
                        />
                      );
                    } else if (isOpp) {
                      markers.push(
                        <g key="opponent">
                          <polygon
                            points={`${pos.x},${tipY} ${pos.x + markerW / 2},${tipY - shoulderH} ${pos.x},${tipY - markerH} ${pos.x - markerW / 2},${tipY - shoulderH}`}
                            fill="#ff4444"
                            stroke="none"
                            strokeWidth="0"
                            pointerEvents="none"
                            className="marker-float"
                          />
                        </g>
                      );
                    }
                    return markers;
                  })()}

                  {/* Intel points display (now always visible as markers are above) */}
                  {hasIntel && !isDis && (
                    <text x={pos.x} y={pos.y + 4} textAnchor="middle" fill="#fe9800" fontSize="10" fontWeight="900" pointerEvents="none">
                      {intelPopup.amount}
                    </text>
                  )}
                  {/* Action pickup display */}
                  {hasAction && !isDis && (
                    <text x={pos.x} y={pos.y + 5} textAnchor="middle" fill="#00ffff" fontSize="12" fontWeight="900" pointerEvents="none">
                      ⚡
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

          {/* City-highlight hint */}
          {highlightedCity && highlightedCity !== playerCity && canAct && (
            <div style={{
              position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(12,14,15,0.92)', border: '1px solid rgba(0,255,255,0.25)',
              padding: '6px 18px', fontSize: 12, color: '#00ffff', letterSpacing: '0.1em', zIndex: 30,
              whiteSpace: 'nowrap',
            }}>
              {selectedCity
                ? 'CLICK AGAIN TO MOVE · click elsewhere to cancel'
                : 'CITY not adjacent to your position'}
              <button onClick={() => { setHighlightedCity(null); setSelectedCity(null); }} style={{
                marginLeft: 12, background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
              }}>✕</button>
            </div>
          )}
          {/* Recenter Button */}
          <button
            className="recenter-btn"
            onClick={handleRecenter}
            onMouseEnter={() => setActionTooltip('RECENTER: Focus on your operative.')}
            onMouseLeave={() => setActionTooltip(null)}
          >
            <span className="material-symbols-outlined">my_location</span>
          </button>

          {/* Tactical Log Overlay (Bottom Left) */}
          <div className="tactical-log-overlay">
            <div className="log-header">TACTICAL LOG</div>
            <div className="log-content">
              {notifications.length === 0 ? (
                <div className="log-empty">&gt; AWAITING INTEL...</div>
              ) : (
                [...notifications].slice(-5).reverse().map((n, i) => (
                  <div key={n.id} className={`log-entry ${n.type || ''} ${i === 0 ? 'latest' : ''}`}>
                    <span className="log-turn">T{n.turn}</span>
                    <span className="log-text">{n.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            className="panel-toggle-btn"
            onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
          >
            <span className="material-symbols-outlined">
              {isMobileViewport 
                ? (isPanelCollapsed ? 'expand_less' : 'expand_more')
                : (isPanelCollapsed ? 'chevron_left' : 'chevron_right')
              }
            </span>
          </button>
        </div>

        {/* ── Side Panel (Thin/Symbolic) ─── */}
        <div className={`game-panel thin ${isPanelCollapsed ? 'collapsed' : ''}`}>
          {/* Agent Section */}
          <div className="panel-group" title="AGENT STATUS">
            <div className="panel-symbol-large" title={`Intel: ${matchState.player.intel}`}>
              <span className="material-symbols-outlined intel-icon">monitoring</span>
              <div className="symbol-value">{matchState.player.intel}</div>
            </div>
            
            <div className="panel-symbol" title={`COVER: ${matchState.player.coverStatus}`}>
              <span className={`material-symbols-outlined ${matchState.player.coverStatus === 'ACTIVE' ? 'active' : (matchState.player.coverStatus === 'UNKNOWN' ? 'dimmed' : 'warn')}`}>
                {matchState.player.coverStatus === 'ACTIVE' ? 'security' : (matchState.player.coverStatus === 'UNKNOWN' ? 'visibility_off' : 'warning')}
              </span>
            </div>

            <div className="symbol-divider"></div>

            <div className="panel-symbol" title={`Strike Report: ${matchState.player.strikeReportUnlocked ? 'ACTIVE' : 'OFFLINE'}`}>
              <span className={`material-symbols-outlined ${matchState.player.strikeReportUnlocked ? 'active' : 'dimmed'}`}>
                plagiarism
              </span>
            </div>
            
            <div className="panel-symbol" title={`Encryption: ${matchState.player.encryptionUnlocked ? 'ACTIVE' : 'OFFLINE'}`}>
              <span className={`material-symbols-outlined ${matchState.player.encryptionUnlocked ? 'active' : 'dimmed'}`}>
                enhanced_encryption
              </span>
            </div>
            
            <div className="panel-symbol" title={`Rapid Recon: ${matchState.player.rapidReconUnlocked ? 'ACTIVE' : 'OFFLINE'}`}>
              <span className={`material-symbols-outlined ${matchState.player.rapidReconUnlocked ? 'active' : 'dimmed'}`}>
                radar
              </span>
            </div>
          </div>

          <div className="section-divider"></div>

          {/* Opponent Section - Only shows high-level passive unlocks, never current Intel or Cover */}
          <div className="panel-group" title="OPPONENT REVEALS">
            <div className="panel-symbol" title={`Opponent Strike Report: ${matchState.player.opponentStrikeReportActive ? 'ACTIVE' : 'OFFLINE'}`}>
              <span className={`material-symbols-outlined ${matchState.player.opponentStrikeReportActive ? 'warn' : 'dimmed'}`}>
                plagiarism
              </span>
            </div>
            
            <div className="panel-symbol" title={`Opponent Encryption: ${matchState.player.opponentEncryptionActive ? 'ACTIVE' : 'OFFLINE'}`}>
              <span className={`material-symbols-outlined ${matchState.player.opponentEncryptionActive ? 'warn' : 'dimmed'}`}>
                enhanced_encryption
              </span>
            </div>
            
            <div className="panel-symbol" title={`Opponent Rapid Recon: ${matchState.player.opponentRapidReconActive ? 'ACTIVE' : 'OFFLINE'}`}>
              <span className={`material-symbols-outlined ${matchState.player.opponentRapidReconActive ? 'warn' : 'dimmed'}`}>
                radar
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar ─── */}
      <div className="game-actions">
        <div onMouseEnter={() => setActionTooltip('WAIT: Stay put and regain Cover (unless in enemy territory).')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn}
            onClick={() => sendAction(ActionKind.WAIT)}
          >
            <span className="material-symbols-outlined">hourglass_empty</span>
            <span className="btn-label">WAIT</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('STRIKE: Attack the opponent at your current location. Reveals you ONLY if opponent has Strike Report.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn}
            onClick={() => {
              sendAction(ActionKind.STRIKE, playerCity || undefined);
            }}
          >
            <span className="material-symbols-outlined">ads_click</span>
            <span className="btn-label">STRIKE</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('CONTROL: Claim this city for your network. Blows Cover.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn || isCityControlledByMe}
            onClick={() => sendAction(ActionKind.CONTROL)}
          >
            <span className="material-symbols-outlined">token</span>
            <span className="btn-label">CONTROL</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip("LOCATE: Reveal the opponent's current city. Costs 10 Intel.")} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn || matchState.player.intel < 10 || isOpponentLocated}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.LOCATE)}
          >
            <span className="material-symbols-outlined">my_location</span>
            <span className="btn-label">LOCATE</span>
            <span className="btn-cost">10</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('DEEP COVER: Hide from Locate attempts and enter opponent-controlled cities safely. Must be last action. Costs 20 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn || matchState.player.intel < 20}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.DEEP_COVER)}
          >
            <span className="material-symbols-outlined">visibility_off</span>
            <span className="btn-label">DEEP COVER</span>
            <span className="btn-cost">20</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('PREP MISSION: Gain an extra action next turn. Must be last action. Cannot use in opponent city. Costs 40 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn || matchState.player.intel < 40}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.PREP_MISSION)}
          >
            <span className="material-symbols-outlined">add_task</span>
            <span className="btn-label">PREP MISSION</span>
            <span className="btn-cost">40</span>
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('STRIKE REPORT: Reveal the opponent\'s location if they attempt a strike. Costs 10 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn || matchState.player.intel < 10 || matchState.player.strikeReportUnlocked}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.STRIKE_REPORT)}
          >
            <span className="material-symbols-outlined">plagiarism</span>
            <span className="btn-label">{matchState.player.strikeReportUnlocked ? 'REPORT ACTIVE' : 'STRIKE REPORT'}</span>
            {!matchState.player.strikeReportUnlocked && <span className="btn-cost">10</span>}
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('ENCRYPTION: Permanently hide what intel actions you take from your opponent. Costs 25 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn || matchState.player.intel < 25 || matchState.player.encryptionUnlocked}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.ENCRYPTION)}
          >
            <span className="material-symbols-outlined">enhanced_encryption</span>
            <span className="btn-label">{matchState.player.encryptionUnlocked ? 'ENCRYPTED' : 'ENCRYPTION'}</span>
            {!matchState.player.encryptionUnlocked && <span className="btn-cost">25</span>}
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('RAPID RECON: Permanently unlock the ability to blow opponent\'s cover by entering their city. Costs 40 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn"
            disabled={!canActBtn || matchState.player.intel < 40 || matchState.player.rapidReconUnlocked}
            onClick={() => sendAction(ActionKind.ABILITY, undefined, AbilityId.RAPID_RECON)}
          >
            <span className="material-symbols-outlined">radar</span>
            <span className="btn-label">{matchState.player.rapidReconUnlocked ? 'RECON ACTIVE' : 'RAPID RECON'}</span>
            {!matchState.player.rapidReconUnlocked && <span className="btn-cost">40</span>}
          </button>
        </div>
        <div onMouseEnter={() => setActionTooltip('END TURN: Pass control to the opponent. Gain +4 Intel.')} onMouseLeave={() => setActionTooltip(null)}>
          <button
            className="action-btn end-turn"
            disabled={!isMyTurn || !!gameOver || !!selectedCity}
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
