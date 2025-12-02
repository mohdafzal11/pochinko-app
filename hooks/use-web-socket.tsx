import { useEffect, useState, useRef, useCallback } from 'react';
import { WebSocketService } from '@/services/web-socket';
// Auto-detect secure WebSocket based on page protocol
const getWebSocketUrl = () => {
  const envUrl = process.env.VITE_WS_URL;
  
  // If VITE_WS_URL is set, use it
  if (envUrl) {
    let wsUrl = envUrl;
    
    // Auto-upgrade to WSS if page is HTTPS
    if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
      wsUrl = wsUrl.replace('ws://', 'wss://');
      console.log('🔒 Upgraded WebSocket to secure:', wsUrl);
    }
    
    // Ensure URL has /ws endpoint
    if (!wsUrl.endsWith('/ws')) {
      wsUrl = wsUrl.endsWith('/') ? `${wsUrl}ws` : `${wsUrl}/ws`;
    }
    
    console.log('🔌 WebSocket URL:', wsUrl);
    return wsUrl;
  }
  
  // Fallback: construct from current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  
  // If on production domain, use API subdomain
  if (host.includes('0xvoid.dev')) {
    const wsUrl = `${protocol}//ore-api.0xvoid.dev/ws`;
    console.log('🔌 WebSocket URL (auto-detected):', wsUrl);
    return wsUrl;
  }
  
  // Local development fallback
  const wsUrl = 'ws://localhost:3920/ws';
  console.log('🔌 WebSocket URL (localhost):', wsUrl);
  return wsUrl;
};

const WS_URL = getWebSocketUrl();

export const useWebSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocketService | null>(null);

  useEffect(() => {
    const ws = new WebSocketService(WS_URL);
    wsRef.current = ws;

    ws.on('connected', () => setIsConnected(true));
    ws.on('disconnected', () => setIsConnected(false));

    ws.connect();

    return () => {
      ws.close();
    };
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

  return {
    isConnected,
    emit,
    on,
    off,
  };
};
