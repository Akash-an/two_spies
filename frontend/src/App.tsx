import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config/GameConfig';
import { WebSocketClient } from './network/WebSocketClient';
import { MockNetworkClient } from './network/MockNetworkClient';
import type { INetworkClient } from './network/NetworkClient';
import { PlayerNameModal } from './ui/PlayerNameModal';
import { ClientMessageType, ServerMessageType } from './types/Messages';

/**
 * Set to true to connect to the real C++ backend on ws://localhost:8080.
 * Set to false to use the in-browser mock server.
 */
const USE_REAL_SERVER = true;
const WS_URL = 'ws://localhost:8080';

/**
 * Lobby phase tracks what the player sees:
 *  - 'entering-name'  → PlayerNameModal is visible
 *  - 'lobby'          → Two buttons: Start Game / Join Game
 *  - 'creating'       → Host created a room — show 4-digit code + waiting spinner
 *  - 'joining'        → Player enters a 4-digit code to join
 *  - 'waiting'        → Join submitted — waiting for match to start
 *  - 'playing'        → Overlays hidden, Phaser GameScene active
 */
type LobbyPhase = 'entering-name' | 'lobby' | 'creating' | 'joining' | 'waiting' | 'playing';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const netRef = useRef<INetworkClient | null>(null);
  const [phase, setPhase] = useState<LobbyPhase>('entering-name');
  const [playerName, setPlayerName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');       // code shown to host
  const [joinCode, setJoinCode] = useState<string>('');       // code typed by joiner
  const [errorMsg, setErrorMsg] = useState<string>('');       // inline error display

  // ── Name submitted → go to lobby ──────────────────────────────
  const handleNameSubmit = useCallback((name: string) => {
    setPlayerName(name);
    setPhase('lobby');

    // Push name into Phaser registry so GameScene can read it
    if (gameRef.current) {
      gameRef.current.registry.set('playerName', name);
    }

    // Tell the server our name (but do NOT join yet)
    const net = netRef.current;
    if (net) {
      net.send(ClientMessageType.SET_PLAYER_NAME, { name: name });
    }
  }, []);

  // ── "Start Game" button → CREATE_MATCH ────────────────────────
  const handleStartGame = useCallback(() => {
    setErrorMsg('');
    const net = netRef.current;
    if (!net) return;
    net.send(ClientMessageType.CREATE_MATCH, {});
    // The server will respond with MATCH_CREATED (containing the code),
    // which the listener below handles.
    setPhase('creating');
  }, []);

  // ── "Join Game" button → show code entry ──────────────────────
  const handleJoinGame = useCallback(() => {
    setErrorMsg('');
    setJoinCode('');
    setPhase('joining');
  }, []);

  // ── Submit join code → JOIN_MATCH with code ───────────────────
  const handleSubmitJoinCode = useCallback(() => {
    setErrorMsg('');
    const trimmed = joinCode.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      setErrorMsg('Please enter a valid 4-digit code.');
      return;
    }
    const net = netRef.current;
    if (!net) return;
    net.send(ClientMessageType.JOIN_MATCH, { code: trimmed });
    setPhase('waiting');
  }, [joinCode]);

  // ── Bootstrap network + Phaser game once on mount ──────────────
  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let cancelled = false; // Prevents race conditions during React Strict Mode double-mount

    // Event handlers for phase transitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMatchCreated = (data: any) => {
      const code: string = data?.payload?.code ?? '';
      setRoomCode(code);
      // Phase is already 'creating'; we just need to display the code.
    };

    const onMatchStart = () => {
      setPhase('playing');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onError = (data: any) => {
      const msg: string = data?.payload?.message ?? 'Unknown error';
      setErrorMsg(msg);
      // If we were waiting/joining, go back to lobby so the user can retry
      setPhase((prev) => (prev === 'waiting' ? 'lobby' : prev));
    };

    let finalClient: INetworkClient;

    const initClient = async () => {
      if (USE_REAL_SERVER) {
        console.info('[App] USE_REAL_SERVER=true, creating WebSocketClient for', WS_URL);
        const ws = new WebSocketClient(WS_URL);
        try {
          await ws.connect();
          if (cancelled) {
            ws.disconnect();
            return;
          }
          console.info('[App] ✓ WebSocketClient connected successfully');
          finalClient = ws;
        } catch (err) {
          if (cancelled) return;
          console.error('[App] ✗ WebSocket connection failed, falling back to mock:', err);
          const mock = new MockNetworkClient();
          await mock.connect();
          if (cancelled) return;
          console.info('[App] Fallback: now using MockNetworkClient');
          finalClient = mock;
        }
      } else {
        console.info('[App] USE_REAL_SERVER=false, using MockNetworkClient');
        const mock = new MockNetworkClient();
        await mock.connect();
        if (cancelled) return;
        finalClient = mock;
      }

      // Store the FINAL client that succeeded
      netRef.current = finalClient;
      console.info('[App] Active client:', finalClient.constructor.name);

      // Attach event listeners
      finalClient.on(ServerMessageType.MATCH_CREATED, onMatchCreated);
      finalClient.on(ServerMessageType.MATCH_START, onMatchStart);
      finalClient.on(ServerMessageType.ERROR, onError);

      // Create Phaser game with the final client
      const game = new Phaser.Game({
        ...GAME_CONFIG,
        parent: containerRef.current!,
        callbacks: {
          postBoot: (g: Phaser.Game) => {
            g.registry.set('network', finalClient);
          },
        },
      });
      gameRef.current = game;
    };

    initClient();

    return () => {
      cancelled = true; // Mark this mount as cancelled
      const client = netRef.current;
      if (client) {
        client.off(ServerMessageType.MATCH_CREATED, onMatchCreated);
        client.off(ServerMessageType.MATCH_START, onMatchStart);
        client.off(ServerMessageType.ERROR, onError);
        client.disconnect();
      }
      netRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  // ── Shared overlay wrapper ─────────────────────────────────────
  const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 15, 35, 0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      {children}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .lobby-spinner {
          display: inline-block;
          width: 20px; height: 20px;
          border: 3px solid #334466;
          border-top-color: #e0c872;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );

  const nameTag = (
    <>
      <h1 style={{ color: '#e0c872', fontSize: '28px', marginBottom: '4px', fontFamily: 'monospace' }}>
        {playerName}
      </h1>
      <p style={{ color: '#8888aa', fontSize: '13px', marginBottom: '28px', fontFamily: 'monospace' }}>
        Your codename
      </p>
    </>
  );

  const btnStyle: React.CSSProperties = {
    padding: '12px 32px',
    fontSize: '16px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    border: '2px solid #e0c872',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background 0.2s',
  };

  const errorBanner = errorMsg && (
    <p style={{ color: '#ff6666', fontSize: '13px', fontFamily: 'monospace', marginTop: '16px' }}>
      {errorMsg}
    </p>
  );

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#0f0f23' }}>
      {/* Phase 1: Enter your codename */}
      {phase === 'entering-name' && <PlayerNameModal onSubmit={handleNameSubmit} />}

      {/* Phase 2: Lobby — Start Game / Join Game */}
      {phase === 'lobby' && (
        <Overlay>
          {nameTag}
          <div style={{ display: 'flex', gap: '20px' }}>
            <button
              onClick={handleStartGame}
              style={{ ...btnStyle, background: '#e0c872', color: '#0f0f23' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0d882')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#e0c872')}
            >
              Start Game
            </button>
            <button
              onClick={handleJoinGame}
              style={{ ...btnStyle, background: 'transparent', color: '#e0c872' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(224,200,114,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Join Game
            </button>
          </div>
          {errorBanner}
        </Overlay>
      )}

      {/* Phase 3a: Host created a match — show room code + wait */}
      {phase === 'creating' && (
        <Overlay>
          {nameTag}
          <p style={{ color: '#cccce0', fontSize: '14px', fontFamily: 'monospace', marginBottom: '12px' }}>
            Share this code with your opponent:
          </p>
          <div style={{
            fontSize: '48px', fontFamily: 'monospace', fontWeight: 'bold',
            color: '#e0c872', letterSpacing: '12px', marginBottom: '28px',
          }}>
            {roomCode || '----'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="lobby-spinner" />
            <span style={{ color: '#cccce0', fontSize: '15px', fontFamily: 'monospace' }}>
              Waiting for opponent to join…
            </span>
          </div>
          <button
            onClick={() => { setPhase('lobby'); setRoomCode(''); }}
            style={{
              ...btnStyle, marginTop: '32px',
              background: 'transparent', color: '#8888aa',
              border: '1px solid #555577', fontSize: '13px', padding: '8px 20px',
            }}
          >
            Cancel
          </button>
        </Overlay>
      )}

      {/* Phase 3b: Joining — enter a 4-digit code */}
      {phase === 'joining' && (
        <Overlay>
          {nameTag}
          <p style={{ color: '#cccce0', fontSize: '14px', fontFamily: 'monospace', marginBottom: '16px' }}>
            Enter the 4-digit room code:
          </p>
          <input
            type="text"
            maxLength={4}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitJoinCode(); }}
            autoFocus
            style={{
              width: '160px', fontSize: '36px', fontFamily: 'monospace', fontWeight: 'bold',
              textAlign: 'center', letterSpacing: '10px', padding: '8px',
              background: '#1a1a2e', border: '2px solid #e0c872', borderRadius: '6px',
              color: '#e0c872', outline: 'none', marginBottom: '20px',
            }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSubmitJoinCode}
              style={{ ...btnStyle, background: '#e0c872', color: '#0f0f23' }}
            >
              Join
            </button>
            <button
              onClick={() => { setPhase('lobby'); setErrorMsg(''); }}
              style={{
                ...btnStyle, background: 'transparent', color: '#8888aa',
                border: '1px solid #555577',
              }}
            >
              Back
            </button>
          </div>
          {errorBanner}
        </Overlay>
      )}

      {/* Phase 4: Submitted join code — waiting for match to start */}
      {phase === 'waiting' && (
        <Overlay>
          {nameTag}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="lobby-spinner" />
            <span style={{ color: '#cccce0', fontSize: '16px', fontFamily: 'monospace' }}>
              Joining match…
            </span>
          </div>
        </Overlay>
      )}

      {/* Phase 5: playing — no overlay, Phaser canvas is fully visible */}

      {/* Phaser canvas mounts here */}
      <div id="phaser-container" ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
