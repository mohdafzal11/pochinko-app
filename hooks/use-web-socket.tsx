import { useEffect, useState, useRef, useCallback } from 'react';
import { WebSocketService } from '@/services/web-socket';
import { useAuth } from '@/contexts/AuthContext';

// Auto-detect secure WebSocket based on page protocol
const getWebSocketUrl = (token?: string | null) => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  let baseUrl = '';
  
  // If VITE_WS_URL is set, use it
  if (envUrl) {
    baseUrl = envUrl;
    
    // Auto-upgrade to WSS if page is HTTPS
    if (window.location.protocol === 'https:' && baseUrl.startsWith('ws://')) {
      baseUrl = baseUrl.replace('ws://', 'wss://');
    }
    
    // Ensure URL has /ws endpoint
    if (!baseUrl.endsWith('/ws')) {
      baseUrl = baseUrl.endsWith('/') ? `${baseUrl}ws` : `${baseUrl}/ws`;
    }
  } else {
    // Fallback: construct from current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    
    // If on production domain, use API subdomain
    if (host.includes('0xvoid.dev')) {
      baseUrl = `${protocol}//ore-api.0xvoid.dev/ws`;
    } else {
      // Local development fallback
      baseUrl = 'ws://localhost:3920/ws';
    }
  }
  
  // Add auth token if available
  if (token) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    baseUrl = `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
  }
  
  return baseUrl;
};

export const useWebSocket = () => {
  const { isAuthenticated, getAuthToken, authenticate, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const wsRef = useRef<WebSocketService | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    // Get current auth token
    const token = getAuthToken();
    
    if (!token) {
      console.log('🔌 WebSocket: No auth token, skipping connection');
      return;
    }
    
    const wsUrl = getWebSocketUrl(token);
    
    console.log('🔌 WebSocket connecting:', wsUrl.replace(/token=[^&]+/, 'token=***'));
    
    const ws = new WebSocketService(wsUrl);
    wsRef.current = ws;

    ws.on('connected', () => {
      setIsConnected(true);
      setAuthError(null);
      console.log('✅ WebSocket connected');
    });
    
    ws.on('disconnected', () => {
      setIsConnected(false);
      console.log('❌ WebSocket disconnected');
    });
    
    // Handle auth errors
    ws.on('auth:error', async (data: { error: string; requiresAuth: boolean }) => {
      console.warn('🔒 WebSocket auth error:', data.error);
      setAuthError(data.error);
      setIsConnected(false);
      
      // Don't auto-reconnect on auth error - wait for new token
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (data.requiresAuth) {
        wsRef.current?.close();
        logout();
        await authenticate();
      }
    });

    ws.connect();
  }, [getAuthToken, authenticate, logout]);

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔐 Auth state changed: authenticated, connecting WebSocket...');
      connect();
    } else {
      console.log('🔓 Auth state changed: not authenticated, closing WebSocket');
      wsRef.current?.close();
      setIsConnected(false);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [isAuthenticated, connect]);

  // Reconnect when auth token changes
  const reconnect = useCallback(() => {
    console.log('🔄 WebSocket reconnecting with new token...');
    wsRef.current?.close();
    
    // Small delay to ensure clean disconnect
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, 100);
  }, [connect]);

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
    authError,
    emit,
    on,
    off,
    reconnect,
  };
};
