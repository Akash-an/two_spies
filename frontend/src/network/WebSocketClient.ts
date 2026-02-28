/**
 * WebSocketClient — thin wrapper around the browser WebSocket API.
 *
 * Extends EventEmitter so it uses the same event-dispatch interface as
 * MockNetworkClient.  Scenes don't need to know whether the connection
 * is real or mocked.
 */

import { EventEmitter } from './EventEmitter';

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;

  constructor(url: string = 'ws://localhost:8080') {
    super();
    this.url = url;
  }

  /**
   * Open the WebSocket connection.  Resolves when the connection is open.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.info('[WS] Attempting connection to', this.url);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.info('[WS] ✓ Connected to', this.url);
        resolve();
      };

      this.ws.onerror = (e) => {
        console.error('[WS] ✗ Connection error:', e);
        reject(e);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            sessionId?: string;
            payload: unknown;
          };
          console.info('[WS] ← Received:', msg.type, msg);
          // Emit using the message type as the event name — same pattern
          // as MockNetworkClient so scenes can listen in the same way.
          this.emit(msg.type, msg);
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        console.info('[WS] Connection closed');
      };
    });
  }

  /**
   * Send a typed message to the server.
   * Matches the MockNetworkClient.send(type, payload) signature.
   */
  send(type: string, payload: Record<string, unknown> = {}): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WS] Cannot send — socket not open (readyState:', this.ws?.readyState, ')');
      return;
    }
    console.info('[WS] → Sending:', type, payload);
    this.ws.send(JSON.stringify({ type, payload }));
  }

  /**
   * Close the connection.
   */
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
