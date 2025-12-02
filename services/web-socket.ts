import { WebSocketMessage } from "@/types/game";

type EventHandler = (data: any) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to WebSocket:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected successfully');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.processMessageQueue();
          this.triggerEvent('connected', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.triggerEvent(message.event, message.data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          console.error('WebSocket URL that failed:', this.url);
          console.error('Current protocol:', window.location.protocol);
          this.isConnecting = false;
          this.triggerEvent('error', error);
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected', { 
            code: event.code, 
            reason: event.reason,
            wasClean: event.wasClean 
          });
          this.isConnecting = false;
          this.ws = null;
          this.triggerEvent('disconnected', {});
          
          // Only reconnect if it's not a clean close and we should reconnect
          if (this.shouldReconnect && event.code !== 1000) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    // Don't reconnect if we've hit the max or if we're already connecting
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isConnecting) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.triggerEvent('reconnect-failed', {});
      }
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnecting && (!this.ws || this.ws.readyState !== WebSocket.OPEN)) {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  emit(event: string, data: any): void {
    const message: WebSocketMessage = { event, data };

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
    }
  }

  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  close(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close(1000, 'Client closed connection');
      this.ws = null;
    }
    this.eventHandlers.clear();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.emit(message.event, message.data);
      }
    }
  }

  private triggerEvent(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }
}
