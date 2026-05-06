import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import CodenameAuthorizationTerminal from './components/CodenameAuthorizationTerminal/CodenameAuthorizationTerminal';
import MissionDeploymentHub from './components/MissionDeploymentHub/MissionDeploymentHub';
import PhaserGame from './components/PhaserGame/PhaserGame';
import { WebSocketClient } from './network/WebSocketClient';
import { ClientMessageType, ServerMessageType } from './types/Messages';
import type { PlayerSide } from './types/Messages';
import './styles/index.css';
import HowToPlayOverlay from './components/PhaserGame/HowToPlayOverlay';
import OrientationGuard from './components/OrientationGuard/OrientationGuard';
import { audioManager } from './audio/AudioManager';

type GamePhase = 'entering-name' | 'reconnecting' | 'deployment' | 'playing';

function App() {
  const netRef = useRef<WebSocketClient | null>(null);
  const [phase, setPhase] = useState<GamePhase>('reconnecting');
  const [playerName, setPlayerName] = useState<string>(localStorage.getItem('two_spies_name') || '');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [matchCode, setMatchCode] = useState<string | null>(null);
  const [urlCode, setUrlCode] = useState<string | null>(null);
  const [matchSessionId, setMatchSessionId] = useState<string | null>(null);
  const [, setPlayerSide] = useState<PlayerSide | null>(null);
  const [initialMap, setInitialMap] = useState<any>(null);
  const [initialState, setInitialState] = useState<any>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const hasAutoJoined = useRef<boolean>(false);
  const matchSessionIdRef = useRef<string | null>(null);


  const [isMuted, setIsMuted] = useState<boolean>(() => audioManager.isMuted());

  const handleToggleMute = () => {
    setIsMuted(audioManager.toggleMute());
  };

  const [logs, setLogs] = useState<string[]>([
    'INITIALIZING LINK...',
    'SCRUBBING METADATA...',
    'BOUNCING SIGNAL: SIN - LDN - DC',
  ]);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [actionTooltip, setActionTooltip] = useState<string | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetActionTooltip = (text: string | null) => {
    // Clear any pending show/hide timers
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (text) {
      // Set a new timer for 1 second to show (peek effect)
      tooltipTimerRef.current = setTimeout(() => {
        setActionTooltip(text);
        tooltipTimerRef.current = null;

        // On mobile/touch specifically, we want an auto-dismiss
        // But let's apply it globally for safety: clear after 4s
        dismissTimerRef.current = setTimeout(() => {
          setActionTooltip(null);
          dismissTimerRef.current = null;
        }, 4000);
      }, 1000);
    } else {
      // Clear immediately if mouse leaves
      setActionTooltip(null);
    }
  };

  // Initialize WebSocket connection on mount
  useEffect(() => {
    // Check URL for existing match session
    const path = window.location.pathname;
    // Format: /match/<sessionId>-<code>
    const urlMatch = path.match(/^\/match\/([^-]+)-(\d{4})$/);
    if (urlMatch) {
      console.log('[App] Match info detected in URL:', urlMatch[1], urlMatch[2]);
      setMatchSessionId(urlMatch[1]);
      matchSessionIdRef.current = urlMatch[1];
      setUrlCode(urlMatch[2]);
    }

    const initConnection = async () => {
      try {
        const client = new WebSocketClient();
        netRef.current = client;

        // Listen for events
        client.on('connected', () => {
          console.log('[App] Connected to backend');
          setIsConnected(true);
          setLogs((p) => [...p, 'CONNECTION ESTABLISHED']);
          setIsLoading(false);
        });

        client.on(ServerMessageType.AUTHENTICATED, (msg: any) => {
          const inMatch = (msg.payload as any)?.in_match;
          console.log('[App] Authenticated confirmation received. inMatch:', inMatch);
          
          if (phase === 'reconnecting') {
            if (!inMatch) {
              console.log('[App] No active match found, moving to entry flow');
              setPhase(playerName ? 'deployment' : 'entering-name');
            } else {
              console.log('[App] Active match found, staying in reconnecting for state sync');
              setLogs((p) => [...p, 'LOCATING ACTIVE MISSION...']);
              
              // Safety fallback: if no MATCH_STATE/MATCH_START arrives in 5 seconds, drop back to deployment
              setTimeout(() => {
                setPhase((current) => {
                  if (current === 'reconnecting') {
                    console.warn('[App] Reconnection timed out waiting for match state');
                    setLogs((p) => [...p, 'RECONNECTION TIMED OUT']);
                    return playerName ? 'deployment' : 'entering-name';
                  }
                  return current;
                });
              }, 5000);
            }
          }
        });

        client.on('error', (err) => {
          console.error('[App] Connection error:', err);
          setLogs((p) => [...p, `ERROR: Connection failed`]);
          setIsLoading(false);
          if (phase === 'reconnecting') {
            setPhase(playerName ? 'deployment' : 'entering-name');
          }
        });

        client.on('disconnected', () => {
          console.log('[App] Disconnected from backend');
          setIsConnected(false);
          setLogs((p) => [...p, 'CONNECTION LOST']);
        });

        // Generic message listener to debug all messages
        client.on('message', () => {
          // console.log('[App] Generic message handler');
        });

        client.on(ServerMessageType.MATCH_CREATED, (msg: any) => {
          console.log('[App] *** MATCH_CREATED EVENT RECEIVED ***');
          const code = (msg.payload as any)?.code;
          if (code) {
            setMatchCode(code);
            setMatchSessionId(msg.sessionId);
            matchSessionIdRef.current = msg.sessionId;
            setLogs((p) => [...p, `MATCH CREATED: Code ${code}`]);
            if (msg.sessionId) {
              window.history.pushState({}, '', `/match/${msg.sessionId}-${code}`);
            }
          }
          setIsLoading(false);
          setLogs((p) => [...p, 'WAITING FOR OPPONENT TO JOIN...']);
          
          setPhase((current) => {
            if (current === 'reconnecting') return 'deployment';
            return current;
          });
        });

        client.on(ServerMessageType.WAITING_FOR_OPPONENT, (msg: any) => {
          console.log('[App] Waiting for opponent:', msg);
          setLogs((p) => [...p, 'WAITING FOR OPPONENT...']);
        });

        client.on(ServerMessageType.MATCH_START, (msg: any) => {
          console.log('[App] Match started - both players ready:', msg);
          
          const msgSessionId = msg.sessionId;
          if (msgSessionId && matchSessionIdRef.current && msgSessionId !== matchSessionIdRef.current) {
            console.log('[App] Ignoring MATCH_START for old/different session:', msgSessionId);
            return;
          }

          const side = (msg.payload as any)?.side as PlayerSide;
          const map = (msg.payload as any)?.map;
          if (side) setPlayerSide(side);
          if (map) setInitialMap(map);
          setLogs((p) => [...p, `MATCH STARTED — You are ${side || 'assigned'}`]);
          setIsLoading(false);
          
          if (msg.sessionId) {
            setMatchSessionId(msg.sessionId);
            matchSessionIdRef.current = msg.sessionId;
            if (matchCode) {
              window.history.pushState({}, '', `/match/${msg.sessionId}-${matchCode}`);
            }
          }

          // Transition to game immediately
          setPhase('playing');
        });

        client.on(ServerMessageType.MATCH_STATE, (msg: any) => {
          console.log('[App] MATCH_STATE received');
          const state = msg.payload;
          const msgSessionId = msg.sessionId;
          
          // Only force transition to 'playing' if the game is actually active
          // AND it matches the session we are currently expecting/linking to.
          if (state) {
            setInitialState(state);
            setIsLoading(false);

            setPhase((current) => {
              // If we aborted or left, matchSessionIdRef.current will be null.
              if (!matchSessionIdRef.current || msgSessionId !== matchSessionIdRef.current) {
                console.log('[App] Ignoring MATCH_STATE for old/different session:', msgSessionId);
                return current;
              }

              if (current === 'reconnecting' || current === 'deployment') {
                return 'playing';
              }
              return current;
            });
          }
        });

        client.on(ServerMessageType.ERROR, (msg: any) => {
          console.error('[App] Server error:', msg);
          const errorMessage = (msg.payload as any)?.message || 'Unknown error';
          setLogs((p) => [...p, `SERVER ERROR: ${errorMessage}`]);
          setJoinError(errorMessage);
          setIsLoading(false);

          // Reset URL to root in case of error (e.g. invalid match ID or full room)
          window.history.pushState({}, '', '/');
          setUrlCode(null);
          setMatchSessionId(null);
          matchSessionIdRef.current = null;
          hasAutoJoined.current = false;

          // Fallback phase if we were trying to auto-reconnect/join
          setPhase((currentPhase) => {
            if (currentPhase === 'reconnecting') {
              return playerName ? 'deployment' : 'entering-name';
            }
            return currentPhase;
          });
        });

        await client.connect();
      } catch (err) {
        console.error('[App] Failed to connect:', err);
        setLogs((p) => [...p, 'FAILED TO ESTABLISH CONNECTION']);
        setIsLoading(false);
      }
    };

    initConnection();

    return () => {
      netRef.current?.disconnect();
    };
  }, []);

  // Auto-join effect
  useEffect(() => {
    if (phase === 'deployment' && isConnected && urlCode && matchSessionId && !hasAutoJoined.current) {
      console.log('[App] ⚡ AUTO-JOINING frequency from URL:', urlCode);
      handleLinkToNetwork(urlCode);
      hasAutoJoined.current = true;
    }
  }, [phase, isConnected, urlCode, matchSessionId]);

  const handleNameSubmit = (codename: string) => {
    setPlayerName(codename);
    localStorage.setItem('two_spies_name', codename);
    setIsLoading(true);
    setLogs((p) => [...p, `CODENAME REGISTERED: ${codename}`]);

    // Send SET_PLAYER_NAME to backend
    if (netRef.current && netRef.current.isConnected()) {
      console.log('[App] Sending SET_PLAYER_NAME:', codename);
      netRef.current.send(ClientMessageType.SET_PLAYER_NAME, { name: codename });
      
      // Transition to deployment screen after a short delay
      setTimeout(() => {
        setIsLoading(false);
        setPhase('deployment');
      }, 800);
    } else {
      console.warn('[App] Not connected, cannot send name');
      setLogs((p) => [...p, 'ERROR: Not connected to server']);
      setIsLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setPlayerName(value);
  };

  // const handleDeploy = (unitId: string) => {
  //   console.log('[App] Deploy unit:', unitId);
  //   setLogs((p) => [...p, `DEPLOYING UNIT: ${unitId}`]);
  // };

  const handleAbortMatch = () => {
    console.log('[App] Aborting match');
    if (netRef.current && netRef.current.isConnected()) {
      netRef.current.send(ClientMessageType.ABORT_MATCH, {});
    }
    
    setIsLoading(false);
    setPhase('deployment');
    setInitialMap(null);
    setInitialState(null);
    setMatchCode(null);
    setMatchSessionId(null);
    if (matchSessionIdRef.current) {
      matchSessionIdRef.current = null;
    }
    setUrlCode(null);
    setPlayerSide(null);
    hasAutoJoined.current = false;
    setLogs(['MISSION ABORTED', 'RETURNING TO HUB...']);
    window.history.pushState({}, '', '/');
  };

  const handleInitiateOperation = () => {
    console.log('[App] Initiating operation...');
    setLogs((p) => [...p, 'INITIATING OPERATION...']);
    setIsLoading(true);
    // Clear any stale match state so the modal triggers fresh when MATCH_CREATED arrives
    setMatchCode(null);
    setMatchSessionId(null);
    matchSessionIdRef.current = null;
    // Send CREATE_MATCH to backend (backend will generate the code)
    if (netRef.current && netRef.current.isConnected()) {
      netRef.current.send(ClientMessageType.CREATE_MATCH, {});
    } else {
      setLogs((p) => [...p, 'ERROR: Not connected to server']);
      setIsLoading(false);
    }
  };

  const handleLinkToNetwork = (frequency: string) => {
    console.log('[App] Joining frequency:', frequency);
    setLogs((p) => [...p, `JOINING FREQUENCY: ${frequency}`]);
    setIsLoading(true);
    setJoinError(null);
    // Send JOIN_MATCH to backend
    if (netRef.current && netRef.current.isConnected()) {
      netRef.current.send(ClientMessageType.JOIN_MATCH, { 
        code: frequency, 
        session_id: matchSessionId || undefined 
      });
      setLogs((p) => [...p, `SEARCHING FOR FREQUENCY: ${frequency}`]);
      // Wait for MATCH_START event from backend to transition to game
    } else {
      setLogs((p) => [...p, `ERROR: Not connected to server`]);
      setJoinError('Not connected to server');
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      {phase === 'playing' && <OrientationGuard allowDismiss={true} />}
      {phase === 'reconnecting' && (
        <div className="terminal-container flex items-center justify-center">
          <div className="terminal-window p-8 border border-cyan-500/30 bg-black/80 backdrop-blur-md">
            <div className="text-cyan-400 font-mono text-xl animate-pulse">
              [ RE-ESTABLISHING SECURE LINK... ]
            </div>
            <div className="text-cyan-700 font-mono text-xs mt-4">
              BOUNCING SIGNAL: {window.location.hash.slice(8, 16)}...
            </div>
          </div>
        </div>
      )}

      {phase === 'entering-name' && (
        <CodenameAuthorizationTerminal
          operativeCodename={playerName}
          sector="07-B"
          latitude="38.9072° N"
          longitude="77.0369° W"
          threatLevel={isConnected ? 'Normal' : 'High'}
          terminalLog={logs}
          onEstablish={handleNameSubmit}
          onInputChange={handleInputChange}
          loading={isLoading}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          setActionTooltip={handleSetActionTooltip}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {phase === 'deployment' && (
        <MissionDeploymentHub
          operativeName={playerName ? `OPERATIVE_${playerName.toUpperCase()}` : 'OPERATIVE_01'}
          sector="BERLIN_VOID"
          networkStatus="Secure"
          intelUpdate="Intercepting encrypted traffic from Sector 7..."
          threatLevel="Local authorities increasing patrol frequency."
          environment="Heavy rain. Visual range reduced to 500m."
          latitude="52.5200° N"
          longitude="13.4050° E"
          logs={logs}
          matchCode={matchCode}
          matchSessionId={matchSessionId}
          onInitiateOperation={handleInitiateOperation}
          onLinkToNetwork={handleLinkToNetwork}
          onAbortMatch={handleAbortMatch}
          onTerminateLink={() => {
            console.log('[App] Terminate link');
            if (netRef.current && netRef.current.isConnected()) {
              netRef.current.send(ClientMessageType.ABORT_MATCH, {});
            }
            
            // Clear identity
            localStorage.removeItem('two_spies_name');
            localStorage.removeItem('two_spies_token');
            setPlayerName('');
            
            setPhase('entering-name');
            setInitialMap(null);
            setInitialState(null);
            setMatchCode(null);
            setMatchSessionId(null);
            matchSessionIdRef.current = null;
            window.history.pushState({}, '', '/');
            setLogs(['INITIALIZING LINK...', 'SCRUBBING METADATA...', 'BOUNCING SIGNAL: SIN - LDN - DC']);
          }}
          loading={isLoading}
          joinError={joinError}
          onClearError={() => setJoinError(null)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          setActionTooltip={handleSetActionTooltip}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}
 
        {phase === 'playing' && netRef.current && (
          <PhaserGame
            operativeName={playerName ? `AGENT_${playerName.toUpperCase()}` : 'AGENT_01'}
            playerName={playerName}
            webSocketClient={netRef.current}
            initialMap={initialMap}
            initialState={initialState}
            onGameEnd={() => {
              console.log('[App] Game ended');
              if (netRef.current && netRef.current.isConnected()) {
                netRef.current.send(ClientMessageType.LEAVE_MATCH, {});
              }
              setPhase('deployment');
              setMatchCode(null);
              setMatchSessionId(null);
              matchSessionIdRef.current = null;
              setPlayerSide(null);
              setInitialMap(null);
              setInitialState(null);
              window.history.pushState({}, '', '/');
            }}
            onTerminateLink={handleAbortMatch}
            setShowHowToPlay={setShowHowToPlay}
            setActionTooltip={handleSetActionTooltip}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}
       {actionTooltip && <div className="action-tooltip">{actionTooltip}</div>}
       {showHowToPlay && (
         <div className="global-overlay-wrapper">
           <HowToPlayOverlay onClose={() => setShowHowToPlay(false)} />
         </div>
       )}
     </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
