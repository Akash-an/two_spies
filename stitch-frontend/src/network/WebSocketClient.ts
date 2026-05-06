import { EventEmitter } from './EventEmitter';

export interface ServerMessage {
  type: string;
  sessionId?: string;
  payload?: Record<string, unknown>;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  public token: string;

  constructor(url: string = import.meta.env.VITE_WS_URL || 'ws://localhost:8085') {
    super();
    
    // Initialize or retrieve player token
    this.token = localStorage.getItem('two_spies_token') || crypto.randomUUID();
    localStorage.setItem('two_spies_token', this.token);
    
    // Support relative URLs (e.g. '/ws') by prepending the current host and appropriate protocol
    if (url.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.url = `${protocol}//${host}${url}`;
    } else {
      this.url = url;
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.info('[WS] Attempting connection to', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.info('[WS] ✓ Connected to', this.url);
        
        // Always authenticate immediately
        const name = localStorage.getItem('two_spies_name') || '';
        this.send('AUTHENTICATE', { player_token: this.token, name });
        
        this.emit('connected');
        resolve();
      };

      this.ws.onerror = (e) => {
        console.error('[WS] ✗ Connection error:', e);
        this.emit('error', e);
        reject(e);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as ServerMessage;
          console.info('[WS] ← Received:', msg.type, JSON.stringify(msg));
          this.emit(msg.type, msg);
          this.emit('message', msg);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err, 'Raw data:', event.data);
        }
      };

      this.ws.onclose = () => {
        console.info('[WS] Connection closed');
        this.emit('disconnected');
      };
    });
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send — socket not open (readyState:', this.ws?.readyState, ')');
      return;
    }
    console.info('[WS] → Sending:', type, payload);
    this.ws.send(JSON.stringify({ type, payload }));
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
