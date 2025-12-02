import { useEffect, useState, useRef, useCallback } from 'react';
import { WebSocketService } from '@/services/web-socket';

const getWebSocketUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;

  if (envUrl && typeof window !== "undefined") {
    let wsUrl = envUrl;

    if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
      wsUrl = wsUrl.replace('ws://', 'wss://');
    }

    if (!wsUrl.endsWith('/ws')) {
      wsUrl = wsUrl.endsWith('/') ? `${wsUrl}ws` : `${wsUrl}/ws`;
    }

    return wsUrl;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;

    if (host.includes('0xvoid.dev')) {
      return `${protocol}//ore-api.0xvoid.dev/ws`;
    }

    return 'ws://localhost:3920/ws';
  }

  return null; // SSR fallback
};

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    const WS_URL = getWebSocketUrl();
    if (!WS_URL) return; // prevent SSR crash

    const ws = new WebSocketService(WS_URL);
    wsRef.current = ws;

    ws.on('connected', () => setIsConnected(true));
    ws.on('disconnected', () => setIsConnected(false));

    ws.connect();

    return () => ws.close();
  }, []);

  const emit = useCallback((event: string, data: any) => {
    wsRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (data: any) => void) => {
    wsRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler?: (data: any) => void) => {
    wsRef.current?.off(event, handler);
  }, []);

  return { isConnected, emit, on, off };
};
