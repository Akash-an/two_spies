import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import CodenameAuthorizationTerminal from './CodenameAuthorizationTerminal';
import MissionDeploymentHub from './MissionDeploymentHub';
import SurveillanceCommandCenterGlobal from './SurveillanceCommandCenterGlobal';
import { WebSocketClient } from './network/WebSocketClient';
import { ClientMessageType, ServerMessageType } from './types/Messages';
import './index.css';

type GamePhase = 'entering-name' | 'deployment' | 'playing';

function App() {
  const netRef = useRef<WebSocketClient | null>(null);
  const [phase, setPhase] = useState<GamePhase>('entering-name');
  const [playerName, setPlayerName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([
    'INITIALIZING LINK...',
    'SCRUBBING METADATA...',
    'BOUNCING SIGNAL: SIN - LDN - DC',
  ]);

  // Initialize WebSocket connection on mount
  useEffect(() => {
    const initConnection = async () => {
      try {
        const client = new WebSocketClient('ws://localhost:8080');
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

        client.on(ServerMessageType.MATCH_CREATED, (msg) => {
          console.log('[App] Match created:', msg);
          setLogs((p) => [...p, `MATCH CREATED: Code ${(msg.payload as any)?.code}`]);
        });

        client.on(ServerMessageType.WAITING_FOR_OPPONENT, (msg) => {
          console.log('[App] Waiting for opponent:', msg);
          setLogs((p) => [...p, 'WAITING FOR OPPONENT...']);
        });

        client.on(ServerMessageType.ERROR, (msg) => {
          console.error('[App] Server error:', msg);
          setLogs((p) => [...p, `SERVER ERROR: ${(msg.payload as any)?.message}`]);
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

  const handleDeploy = (unitId: string) => {
    console.log('[App] Deploy unit:', unitId);
    setLogs((p) => [...p, `DEPLOYING UNIT: ${unitId}`]);
  };

  const handleInitiateOperation = (frequency: string) => {
    console.log('[App] Frequency generated:', frequency);
    setLogs((p) => [...p, `FREQUENCY GENERATED: ${frequency}`]);
    // Send CREATE_MATCH to backend if needed
    if (netRef.current && netRef.current.isConnected()) {
      netRef.current.send(ClientMessageType.CREATE_MATCH, { roomCode: frequency });
    }
  };

  const handleLinkToNetwork = (frequency: string) => {
    console.log('[App] Joining frequency:', frequency);
    setLogs((p) => [...p, `JOINING FREQUENCY: ${frequency}`]);
    setIsLoading(true);
    // Send JOIN_MATCH to backend
    if (netRef.current && netRef.current.isConnected()) {
      netRef.current.send(ClientMessageType.JOIN_MATCH, { roomCode: frequency });
      setTimeout(() => {
        setIsLoading(false);
        setLogs((p) => [...p, `CONNECTED TO FREQUENCY: ${frequency}`]);
        // Transition to playing phase
        setPhase('playing');
      }, 1000);
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
        />
      )}

      {phase === 'deployment' && (
        <MissionDeploymentHub
          operativeName={playerName ? `OPERATIVE_${playerName.toUpperCase()}` : 'OPERATIVE_01'}
          sector="BERLIN_VOID"
          turnCycle="05/12"
          location="Berlin"
          coverLevel={92}
          networkStatus="Secure"
          intelUpdate="Intercepting encrypted traffic from Sector 7..."
          threatLevel="Local authorities increasing patrol frequency."
          environment="Heavy rain. Visual range reduced to 500m."
          latitude="52.5200° N"
          longitude="13.4050° E"
          logs={logs}
          onInitiateOperation={handleInitiateOperation}
          onLinkToNetwork={handleLinkToNetwork}
          onTerminateLink={() => {
            console.log('[App] Terminate link');
            setPhase('entering-name');
            setPlayerName('');
            setLogs(['INITIALIZING LINK...', 'SCRUBBING METADATA...', 'BOUNCING SIGNAL: SIN - LDN - DC']);
          }}
          loading={isLoading}
        />
      )}

      {phase === 'playing' && (
        <SurveillanceCommandCenterGlobal
          operativeName={playerName ? `OPERATIVE_${playerName.toUpperCase()}` : 'OPERATIVE_01'}
          sector="BERLIN_VOID"
          location="Berlin"
          coverLevel={92}
          turnCycle="05/12"
          latitude="52.5200° N"
          longitude="13.4050° E"
          cities={[
            { id: 'nyc', name: 'NEW YORK CITY', x: 25, y: 35 },
            { id: 'berlin', name: 'BERLIN_VOID', x: 48, y: 30, isActive: true, isAlly: true },
            { id: 'london', name: 'LONDON', x: 44, y: 28 },
            { id: 'tokyo', name: 'TOKYO', x: 85, y: 38 },
            { id: 'moscow', name: 'MOSCOW', x: 58, y: 25 },
            { id: 'cairo', name: 'CAIRO', x: 52, y: 45 },
            { id: 'buenos-aires', name: 'BUENOS AIRES', x: 30, y: 80 },
          ]}
          logs={logs}
          onSelectCity={(cityId) => {
            console.log('[App] Selected city:', cityId);
            setLogs((p) => [...p, `CITY SELECTED: ${cityId}`]);
          }}
          onInfiltrate={() => {
            console.log('[App] Infiltrate');
            setLogs((p) => [...p, 'INFILTRATING TARGET LOCATION...']);
          }}
          onTerminateLink={() => {
            console.log('[App] Terminate link');
            setPhase('entering-name');
            setPlayerName('');
            setLogs(['INITIALIZING LINK...', 'SCRUBBING METADATA...', 'BOUNCING SIGNAL: SIN - LDN - DC']);
          }}
          loading={isLoading}
        />
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
