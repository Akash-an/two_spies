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

type GamePhase = 'entering-name' | 'deployment' | 'playing';

function App() {
  const netRef = useRef<WebSocketClient | null>(null);
  const [phase, setPhase] = useState<GamePhase>('entering-name');
  const [playerName, setPlayerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [matchCode, setMatchCode] = useState<string | null>(null);
  const [, setPlayerSide] = useState<PlayerSide | null>(null);
  const [initialMap, setInitialMap] = useState<any>(null);
  const [initialState, setInitialState] = useState<any>(null);

  const [logs, setLogs] = useState<string[]>([
    'INITIALIZING LINK...',
    'SCRUBBING METADATA...',
    'BOUNCING SIGNAL: SIN - LDN - DC',
  ]);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [actionTooltip, setActionTooltip] = useState<string | null>(null);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetActionTooltip = (text: string | null) => {
    // Clear any pending timer
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }

    if (text) {
      // Set a new timer for 1 second
      tooltipTimerRef.current = setTimeout(() => {
        setActionTooltip(text);
        tooltipTimerRef.current = null;
      }, 1000);
    } else {
      // Clear immediately if mouse leaves
      setActionTooltip(null);
    }
  };

  // Initialize WebSocket connection on mount
  useEffect(() => {
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

        client.on('error', (err) => {
          console.error('[App] Connection error:', err);
          setLogs((p) => [...p, `ERROR: Connection failed`]);
          setIsLoading(false);
        });

        client.on('disconnected', () => {
          console.log('[App] Disconnected from backend');
          setIsConnected(false);
          setLogs((p) => [...p, 'CONNECTION LOST']);
        });

        // Generic message listener to debug all messages
        client.on('message', (msg: any) => {
          console.log('[App] Generic message handler - type:', msg.type);
        });

        client.on(ServerMessageType.MATCH_CREATED, (msg: any) => {
          console.log('[App] *** MATCH_CREATED EVENT RECEIVED ***');
          console.log('[App] Full message:', JSON.stringify(msg, null, 2));
          console.log('[App] msg.payload:', msg.payload);
          console.log('[App] msg.payload?.code:', msg.payload?.code);
          
          const code = (msg.payload as any)?.code;
          console.log('[App] Extracted code:', code, '(type:', typeof code, ')');
          
          if (code) {
            console.log('[App] Setting matchCode to:', code);
            setMatchCode(code);
            setLogs((p) => [...p, `MATCH CREATED: Code ${code}`]);
          } else {
            console.warn('[App] ⚠️  NO CODE FOUND IN PAYLOAD');
          }
          setIsLoading(false);
          // Initiating player stays on deployment screen, waits for opponent
          setLogs((p) => [...p, 'WAITING FOR OPPONENT TO JOIN...']);
        });

        client.on(ServerMessageType.WAITING_FOR_OPPONENT, (msg: any) => {
          console.log('[App] Waiting for opponent:', msg);
          setLogs((p) => [...p, 'WAITING FOR OPPONENT...']);
        });

        client.on(ServerMessageType.MATCH_START, (msg: any) => {
          console.log('[App] Match started - both players ready:', msg);
          const side = (msg.payload as any)?.side as PlayerSide;
          const map = (msg.payload as any)?.map;
          if (side) setPlayerSide(side);
          if (map) setInitialMap(map);
          setLogs((p) => [...p, `MATCH STARTED — You are ${side || 'assigned'}`]);
          setIsLoading(false);
          // Transition to game immediately
          setPhase('playing');
        });

        client.on(ServerMessageType.MATCH_STATE, (msg: any) => {
          console.log('[App] MATCH_STATE received:', msg.type);
          // Always capture — PhaserGame uses this as its initial state on mount
          // and handles subsequent updates via its own subscription.
          setInitialState(msg.payload);
        });

        client.on(ServerMessageType.ERROR, (msg: any) => {
          console.error('[App] Server error:', msg);
          const errorMessage = (msg.payload as any)?.message || 'Unknown error';
          setLogs((p) => [...p, `SERVER ERROR: ${errorMessage}`]);
          setIsLoading(false);
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

  const handleNameSubmit = (codename: string) => {
    setPlayerName(codename);
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

  const handleInitiateOperation = () => {
    console.log('[App] Initiating operation...');
    setLogs((p) => [...p, 'INITIATING OPERATION...']);
    setIsLoading(true);
    // Send CREATE_MATCH to backend (backend will generate the code)
    if (netRef.current && netRef.current.isConnected()) {
      netRef.current.send(ClientMessageType.CREATE_MATCH, {});
    }
  };

  const handleLinkToNetwork = (frequency: string) => {
    console.log('[App] Joining frequency:', frequency);
    setLogs((p) => [...p, `JOINING FREQUENCY: ${frequency}`]);
    setIsLoading(true);
    // Send JOIN_MATCH to backend
    if (netRef.current && netRef.current.isConnected()) {
      netRef.current.send(ClientMessageType.JOIN_MATCH, { code: frequency });
      setLogs((p) => [...p, `SEARCHING FOR FREQUENCY: ${frequency}`]);
      // Wait for MATCH_START event from backend to transition to game
    } else {
      setLogs((p) => [...p, `ERROR: Not connected to server`]);
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
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
           onInitiateOperation={handleInitiateOperation}
           onLinkToNetwork={handleLinkToNetwork}
           onTerminateLink={() => {
             console.log('[App] Terminate link');
             if (netRef.current && netRef.current.isConnected()) {
               netRef.current.send(ClientMessageType.ABORT_MATCH, {});
             }
              setPhase('deployment');
              setInitialMap(null);
              setInitialState(null);
              setMatchCode(null);
              setLogs(['INITIALIZING LINK...', 'SCRUBBING METADATA...', 'BOUNCING SIGNAL: SIN - LDN - DC']);
           }}
           loading={isLoading}
           onOpenHowToPlay={() => setShowHowToPlay(true)}
           setActionTooltip={handleSetActionTooltip}
         />
       )}
 
        {phase === 'playing' && netRef.current && (
          <PhaserGame
            operativeName={playerName ? `OPERATIVE_${playerName.toUpperCase()}` : 'OPERATIVE_01'}
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
              setPlayerSide(null);
              setInitialMap(null);
              setInitialState(null);
            }}
            onTerminateLink={() => {
              console.log('[App] Terminate link from game');
              if (netRef.current && netRef.current.isConnected()) {
                netRef.current.send(ClientMessageType.ABORT_MATCH, {});
              }
              setPhase('deployment');
              setInitialMap(null);
              setInitialState(null);
              setMatchCode(null);
              setLogs(['INITIALIZING LINK...', 'SCRUBBING METADATA...', 'BOUNCING SIGNAL: SIN - LDN - DC']);
            }}
            setShowHowToPlay={setShowHowToPlay}
            setActionTooltip={handleSetActionTooltip}
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
