import { EventEmitter } from './EventEmitter';
export class WebSocketClient extends EventEmitter {
    constructor(url = 'ws://localhost:8080') {
        super();
        Object.defineProperty(this, "ws", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "url", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.url = url;
    }
    connect() {
        return new Promise((resolve, reject) => {
            console.info('[WS] Attempting connection to', this.url);
            this.ws = new WebSocket(this.url);
            this.ws.onopen = () => {
                console.info('[WS] ✓ Connected to', this.url);
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
                    const msg = JSON.parse(event.data);
                    console.info('[WS] ← Received:', msg.type, msg);
                    this.emit(msg.type, msg);
                    this.emit('message', msg);
                }
                catch (err) {
                    console.error('[WS] Failed to parse message:', err);
                }
            };
            this.ws.onclose = () => {
                console.info('[WS] Connection closed');
                this.emit('disconnected');
            };
        });
    }
    send(type, payload = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WS] Cannot send — socket not open (readyState:', this.ws?.readyState, ')');
            return;
        }
        console.info('[WS] → Sending:', type, payload);
        this.ws.send(JSON.stringify({ type, payload }));
    }
    disconnect() {
        this.ws?.close();
        this.ws = null;
    }
    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
}
