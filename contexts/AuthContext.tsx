/**
 * AuthContext
 * 
 * Provides authentication state to the entire app.
 * Automatically prompts for signature when wallet connects.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  authenticate, 
  clearAuth, 
  getAuthStatus, 
  needsRefresh,
  hasValidSession,
  authFetch,
  signSensitiveAction,
  getAuthToken,
} from '@/lib/auth';

export interface AuthState {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  wallet: string | null;
  error: string | null;
  expiresAt: number | null;
}

interface AuthContextType extends AuthState {
  authenticate: () => Promise<void>;
  logout: () => void;
  signAction: (action: string, amount: number) => Promise<{ signature: string; timestamp: number } | null>;
  authFetch: typeof authFetch;
  getAuthToken: typeof getAuthToken;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const wallet = useWallet();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAuthenticating: false,
    wallet: null,
    error: null,
    expiresAt: null,
  });
  
  // Track the last authenticated wallet to detect changes
  const lastWalletRef = useRef<string | null>(null);
  // Prevent concurrent auth attempts
  const authInProgressRef = useRef<boolean>(false);
  
  // Authenticate function
  const doAuthenticate = useCallback(async () => {
    if (!wallet.connected || !wallet.publicKey || !wallet.signMessage) {
      setAuthState({
        isAuthenticated: false,
        isAuthenticating: false,
        wallet: null,
        error: null,
        expiresAt: null,
      });
      return;
    }
    
    // Prevent concurrent auth attempts
    if (authInProgressRef.current) {
      console.log('[AuthProvider] Auth already in progress, skipping...');
      return;
    }
    
    authInProgressRef.current = true;
    
    console.log('[AuthProvider] Starting authentication for wallet:', wallet.publicKey.toBase58().slice(0, 8) + '...');
    setAuthState(prev => ({ ...prev, isAuthenticating: true, error: null }));
    
    try {
      const result = await authenticate(wallet);
      
      if (result.success) {
        const status = getAuthStatus();
        console.log('[AuthProvider] Authentication successful');
        setAuthState({
          isAuthenticated: true,
          isAuthenticating: false,
          wallet: status.wallet,
          error: null,
          expiresAt: status.expiresAt,
        });
        lastWalletRef.current = status.wallet;
      } else {
        console.warn('[AuthProvider] Authentication failed:', result.error);
        setAuthState({
          isAuthenticated: false,
          isAuthenticating: false,
          wallet: null,
          error: result.error || 'Authentication failed',
          expiresAt: null,
        });
      }
    } finally {
      authInProgressRef.current = false;
    }
  }, [wallet]);
  
  // Handle wallet connection/disconnection/change
  useEffect(() => {
    const currentWallet = wallet.publicKey?.toBase58() || null;
    
    // Wallet disconnected
    if (!wallet.connected || !currentWallet) {
      if (lastWalletRef.current) {
        console.log('[AuthProvider] Wallet disconnected, clearing auth');
        clearAuth();
        lastWalletRef.current = null;
        setAuthState({
          isAuthenticated: false,
          isAuthenticating: false,
          wallet: null,
          error: null,
          expiresAt: null,
        });
      }
      return;
    }
    
    // Check if we have a valid stored session for this wallet
    if (hasValidSession(currentWallet)) {
      const status = getAuthStatus();
      console.log(`[AuthProvider] Restored valid session for ${currentWallet.slice(0, 8)}... (no signature needed)`);
      lastWalletRef.current = currentWallet;
      setAuthState({
        isAuthenticated: true,
        isAuthenticating: false,
        wallet: status.wallet,
        error: null,
        expiresAt: status.expiresAt,
      });
      return;
    }
    
    // Wallet connected or changed - need signMessage capability
    if (!wallet.signMessage) {
      console.log('[AuthProvider] Wallet connected but signMessage not available yet');
      return;
    }
    
    // Wallet changed or first connection - need new signature
    if (currentWallet !== lastWalletRef.current) {
      console.log('[AuthProvider] Wallet connected/changed, need signature...');
      // Clear old auth if wallet changed
      if (lastWalletRef.current && lastWalletRef.current !== currentWallet) {
        clearAuth();
      }
      doAuthenticate();
    }
  }, [wallet.connected, wallet.publicKey, wallet.signMessage, doAuthenticate]);
  
  // Periodic token refresh check
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    
    const checkInterval = setInterval(() => {
      if (needsRefresh()) {
        console.log('[AuthProvider] Token expiring soon, re-authenticating...');
        doAuthenticate();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [authState.isAuthenticated, doAuthenticate]);
  
  // Logout
  const logout = useCallback(() => {
    clearAuth();
    lastWalletRef.current = null;
    setAuthState({
      isAuthenticated: false,
      isAuthenticating: false,
      wallet: null,
      error: null,
      expiresAt: null,
    });
  }, []);
  
  // Sign sensitive action (for withdrawals)
  const signAction = useCallback(async (action: string, amount: number) => {
    return signSensitiveAction(wallet, action, amount);
  }, [wallet]);
  
  const value: AuthContextType = {
    ...authState,
    authenticate: doAuthenticate,
    logout,
    signAction,
    authFetch,
    getAuthToken,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
