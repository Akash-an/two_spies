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

    // Store MATCH_STATE in registry so GameScene can access it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMatchState = (data: any) => {
      if (gameRef.current) {
        console.log('[App] MATCH_STATE received, storing in registry');
        gameRef.current.registry.set('latestMatchState', data.payload);
        // Notify GameScene if it's already active
        gameRef.current.events.emit('match-state-updated', data.payload);
      }
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
      finalClient.on(ServerMessageType.MATCH_STATE, onMatchState);
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

      // "Play Again" — reload the page so the lobby re-initialises cleanly
      game.events.on('return-to-lobby', () => {
        window.location.reload();
      });
    };

    initClient();

    return () => {
      cancelled = true; // Mark this mount as cancelled
      const client = netRef.current;
      if (client) {
        client.off(ServerMessageType.MATCH_CREATED, onMatchCreated);
        client.off(ServerMessageType.MATCH_START, onMatchStart);
        client.off(ServerMessageType.MATCH_STATE, onMatchState);
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
      backgroundColor: '#6db5ae',  // OCEAN_TEAL
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
          border: 3px solid #c8a96e;
          border-top-color: #3d2010;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );

  const nameTag = (
    <>
      <h1 style={{ color: '#2a1a0a', fontSize: '28px', marginBottom: '4px', fontFamily: "'Georgia', serif", fontWeight: 'bold' }}>
        {playerName}
      </h1>
      <p style={{ color: '#5a3a1a', fontSize: '13px', marginBottom: '28px', fontFamily: "'Georgia', serif", fontStyle: 'italic' }}>
        Your codename
      </p>
    </>
  );

  const btnStyle: React.CSSProperties = {
    padding: '11px 30px',
    fontSize: '14px',
    fontFamily: "'Georgia', serif",
    fontWeight: 'bold',
    border: '1px solid #c8a96e',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  };

  const errorBanner = errorMsg && (
    <p style={{ color: '#c0392b', fontSize: '13px', fontFamily: "'Georgia', serif", marginTop: '16px' }}>
      {errorMsg}
    </p>
  );

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: '#6db5ae' }}>
      {/* Phase 1: Enter your codename */}
      {phase === 'entering-name' && <PlayerNameModal onSubmit={handleNameSubmit} />}

      {/* Phase 2: Lobby — Start Game / Join Game */}
      {phase === 'lobby' && (
        <Overlay>
          <h1 style={{ fontFamily: "'Georgia', serif", fontSize: '52px', fontWeight: 'bold', color: '#2a1a0a', marginBottom: '4px', letterSpacing: '2px' }}>TWO SPIES</h1>
          <p style={{ fontFamily: "'Georgia', serif", fontSize: '16px', fontStyle: 'italic', color: '#5a3a1a', marginBottom: '36px' }}>a game of espionage</p>
          {nameTag}
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={handleStartGame}
              style={{ ...btnStyle, background: '#3d2010', color: '#f5f0d8', borderColor: '#2a1a0a' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#5a3010')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3d2010')}
            >
              Start Game
            </button>
            <button
              onClick={handleJoinGame}
              style={{ ...btnStyle, background: '#e8dfc0', color: '#2a1a0a' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#c8a96e')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#e8dfc0')}
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
          <p style={{ color: '#5a3a1a', fontSize: '14px', fontFamily: "'Georgia', serif", marginBottom: '12px', fontStyle: 'italic' }}>
            Share this code with your opponent:
          </p>
          <div style={{
            fontSize: '48px', fontFamily: "'Georgia', serif", fontWeight: 'bold',
            color: '#2a1a0a', letterSpacing: '14px', marginBottom: '28px',
            backgroundColor: '#f5f0d8', padding: '12px 28px', borderRadius: '4px',
            border: '1px solid #c8a96e',
          }}>
            {roomCode || '----'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="lobby-spinner" />
            <span style={{ color: '#2a1a0a', fontSize: '15px', fontFamily: "'Georgia', serif", fontStyle: 'italic' }}>
              Waiting for opponent to join...
            </span>
          </div>
          <button
            onClick={() => { setPhase('lobby'); setRoomCode(''); }}
            style={{
              ...btnStyle, marginTop: '32px',
              background: '#e8dfc0', color: '#5a3a1a',
              border: '1px solid #c8a96e', fontSize: '12px', padding: '8px 20px',
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
          <p style={{ color: '#5a3a1a', fontSize: '14px', fontFamily: "'Georgia', serif", marginBottom: '16px', fontStyle: 'italic' }}>
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
              width: '160px', fontSize: '36px', fontFamily: "'Georgia', serif", fontWeight: 'bold',
              textAlign: 'center', letterSpacing: '10px', padding: '8px',
              background: '#f5f0d8', border: '2px solid #c8a96e', borderRadius: '4px',
              color: '#2a1a0a', outline: 'none', marginBottom: '20px',
            }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSubmitJoinCode}
              style={{ ...btnStyle, background: '#3d2010', color: '#f5f0d8', borderColor: '#2a1a0a' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#5a3010')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#3d2010')}
            >
              Join
            </button>
            <button
              onClick={() => { setPhase('lobby'); setErrorMsg(''); }}
              style={{ ...btnStyle, background: '#e8dfc0', color: '#5a3a1a' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#c8a96e')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#e8dfc0')}
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
            <span style={{ color: '#2a1a0a', fontSize: '16px', fontFamily: "'Georgia', serif", fontStyle: 'italic' }}>
              Joining match...
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
