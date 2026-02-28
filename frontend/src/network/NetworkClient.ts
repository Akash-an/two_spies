/**
 * NetworkClient — common interface type for both Mock and real WebSocket clients.
 *
 * Both MockNetworkClient and WebSocketClient extend EventEmitter and implement
 * the same connect / send / disconnect API.  Scenes type their network dependency
 * against this interface so they work with either implementation.
 */

import { EventEmitter } from './EventEmitter';

export interface INetworkClient extends EventEmitter {
  connect(): Promise<void>;
  send(type: string, payload?: Record<string, unknown>): void;
  disconnect(): void;
}

/**
 * Factory: create the appropriate network client based on environment.
 * - In production (or when WS server is running): WebSocketClient
 * - Fallback: MockNetworkClient
 */
export async function createNetworkClient(useRealServer = true): Promise<INetworkClient> {
  if (useRealServer) {
    const { WebSocketClient } = await import('./WebSocketClient');
    // Read server URL from env or default to localhost:8080
    const url = (import.meta as unknown as { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL
      ?? 'ws://localhost:8080';
    return new WebSocketClient(url);
  } else {
    const { MockNetworkClient } = await import('./MockNetworkClient');
    return new MockNetworkClient();
  }
}
