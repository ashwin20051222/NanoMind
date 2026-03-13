export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseDelay = 1000;
  private outgoingQueue: any[] = [];
  private callbacks: {
    onOpen?: () => void;
    onStatus?: (status: string) => void;
    onMessage?: (msg: any) => void;
  };

  constructor(url: string, token: string, callbacks: any = {}) {
    this.url = url;
    this.token = token;
    this.callbacks = callbacks;
    this.connect();
  }

  private connect() {
    try {
      let finalUrl = this.url;
      // Protocol fallback: Prevent Mixed Content errors in secure contexts
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && finalUrl.startsWith('ws://')) {
        finalUrl = finalUrl.replace('ws://', 'wss://');
        console.warn(`[WSClient] Upgraded ws:// to wss:// to prevent Mixed Content block.`);
      }

      this.ws = new WebSocket(finalUrl, ['nanomind-protocol-v1']);
      
      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.callbacks.onOpen?.();
        
        // Authenticate
        this.send({ type: 'auth', token: this.token }, true);
        
        // Flush queue safely
        while (this.outgoingQueue.length > 0) {
          const msg = this.outgoingQueue.shift();
          this.ws?.send(JSON.stringify(msg));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.callbacks.onMessage?.(data);
        } catch (e) {
          console.error('[WSClient] Failed to parse message:', e);
        }
      };

      this.ws.onclose = (event) => {
        console.warn(`[WSClient] Connection closed. Code: ${event.code}, Reason: ${event.reason || 'None'}`);
        this.callbacks.onStatus?.('local_offline');
        this.handleReconnect();
      };

      this.ws.onerror = (event) => {
        // Browser WS errors are intentionally opaque for security (no HTTP status/TLS details).
        // Using console.warn instead of console.error to prevent Next.js from showing the red error overlay
        // since connection failure is an expected state that triggers our cloud fallback.
        console.warn('[WSClient] WebSocket connection failed (expected if local edge server is offline).', {
          url: finalUrl,
          readyState: this.ws?.readyState, // 3 = CLOSED (usually means handshake failed)
          isTrusted: event.isTrusted,
          hint: 'Check Network tab for 403/502/SSL errors. Ensure server accepts subprotocol "nanomind-protocol-v1".'
        });
      };
    } catch (e) {
      console.warn('[WSClient] Failed to instantiate WebSocket:', e);
      this.handleReconnect();
    }
  }

  public getConnectionStatus(): string {
    if (!this.ws) return 'uninitialized';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.callbacks.onStatus?.('reconnecting');
      const delay = this.baseDelay * Math.pow(2, this.reconnectAttempts) + Math.random() * 1000;
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    } else {
      this.callbacks.onStatus?.('cloud_fallback');
    }
  }

  public send(message: any, bypassQueue = false) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else if (!bypassQueue) {
      this.outgoingQueue.push(message);
    }
  }

  public close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
