/**
 * Authentication Service
 * 
 * Manages JWT tokens for authenticated API requests.
 * 
 * Flow:
 * 1. User connects wallet
 * 2. Call authenticate() to get challenge, sign it, and receive JWT
 * 3. All subsequent API calls include JWT in Authorization header
 * 4. On wallet change or token expiry, re-authenticate
 */

import { WalletContextState } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_API_URL ||
  'http://localhost:3920';
const IS_BROWSER = typeof window !== 'undefined';

// LocalStorage keys
const STORAGE_KEY_TOKEN = 'ore_auth_token';
const STORAGE_KEY_EXPIRY = 'ore_auth_expiry';
const STORAGE_KEY_WALLET = 'ore_auth_wallet';

// Token storage (in-memory cache)
let authToken: string | null = null;
let tokenExpiry: number | null = null;
let authenticatedWallet: string | null = null;

/**
 * Load auth from localStorage on module init
 */
function loadStoredAuth(): void {
  try {
    if (!IS_BROWSER) return;

    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const storedExpiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
    const storedWallet = localStorage.getItem(STORAGE_KEY_WALLET);
    
    if (storedToken && storedExpiry && storedWallet) {
      const expiry = parseInt(storedExpiry, 10);
      
      // Check if token is still valid
      if (Date.now() < expiry) {
        authToken = storedToken;
        tokenExpiry = expiry;
        authenticatedWallet = storedWallet;
        console.log(`[Auth] Restored session for ${storedWallet.slice(0, 8)}... (expires in ${Math.round((expiry - Date.now()) / 60000)}m)`);
      } else {
        // Token expired, clear storage
        console.log('[Auth] Stored token expired, clearing');
        clearStoredAuth();
      }
    }
  } catch (error) {
    console.warn('[Auth] Failed to load stored auth:', error);
  }
}

/**
 * Save auth to localStorage
 */
function saveAuth(): void {
  try {
    if (!IS_BROWSER) return;

    if (authToken && tokenExpiry && authenticatedWallet) {
      localStorage.setItem(STORAGE_KEY_TOKEN, authToken);
      localStorage.setItem(STORAGE_KEY_EXPIRY, tokenExpiry.toString());
      localStorage.setItem(STORAGE_KEY_WALLET, authenticatedWallet);
    }
  } catch (error) {
    console.warn('[Auth] Failed to save auth:', error);
  }
}

/**
 * Clear auth from localStorage
 */
function clearStoredAuth(): void {
  try {
    if (!IS_BROWSER) return;

    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
    localStorage.removeItem(STORAGE_KEY_WALLET);
  } catch (error) {
    console.warn('[Auth] Failed to clear stored auth:', error);
  }
}

// Load stored auth on module initialization (browser only)
if (IS_BROWSER) {
  loadStoredAuth();
}

/**
 * Get current auth status
 */
export function getAuthStatus(): {
  isAuthenticated: boolean;
  wallet: string | null;
  expiresAt: number | null;
  isExpired: boolean;
} {
  const isExpired = tokenExpiry ? Date.now() > tokenExpiry : true;
  return {
    isAuthenticated: !!authToken && !isExpired,
    wallet: authenticatedWallet,
    expiresAt: tokenExpiry,
    isExpired,
  };
}

/**
 * Get auth headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  if (!authToken) return {};
  return {
    'Authorization': `Bearer ${authToken}`,
  };
}

/**
 * Get raw auth token (for WebSocket connections)
 */
export function getAuthToken(): string | null {
  const status = getAuthStatus();
  if (!status.isAuthenticated) return null;
  return authToken;
}

/**
 * Authenticate with the server
 * 
 * @param wallet - Wallet adapter instance
 * @returns Success status and error if any
 */
export async function authenticate(
  wallet: WalletContextState
): Promise<{ success: boolean; error?: string }> {
  if (!wallet.publicKey || !wallet.signMessage) {
    return { success: false, error: 'Wallet not connected or does not support signing' };
  }

  const walletAddress = wallet.publicKey.toBase58();

  try {
    // Step 1: Request challenge from server
    const challengeResponse = await fetch(`${API_URL}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    });

    if (!challengeResponse.ok) {
      const error = await challengeResponse.json();
      return { success: false, error: error.error || 'Failed to get challenge' };
    }

    const { challenge, message } = await challengeResponse.json();
    console.log('[Auth] Got challenge:', challenge.slice(0, 20) + '...');

    // Step 2: Sign the challenge message
    console.log('[Auth] Requesting wallet signature...');
    const messageBytes = new TextEncoder().encode(challenge);
    const signature = await wallet.signMessage(messageBytes);
    const signatureBase58 = bs58.encode(signature);
    console.log('[Auth] Got signature, verifying...');

    // Step 3: Verify signature and get token
    const verifyResponse = await fetch(`${API_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        signature: signatureBase58,
        challenge,
      }),
    });

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json();
      return { success: false, error: error.error || 'Signature verification failed' };
    }

    const { token, expiresAt } = await verifyResponse.json();

    // Store token in memory and localStorage
    authToken = token;
    tokenExpiry = expiresAt;
    authenticatedWallet = walletAddress;
    saveAuth();

    console.log(`[Auth] Authenticated as ${walletAddress.slice(0, 8)}... (expires in 2h)`);

    return { success: true };
  } catch (error: any) {
    console.error('[Auth] Authentication failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear authentication (logout)
 */
export function clearAuth(): void {
  authToken = null;
  tokenExpiry = null;
  authenticatedWallet = null;
  clearStoredAuth();
  console.log('[Auth] Logged out');
}

/**
 * Check if we have a valid stored session for a specific wallet
 * Returns true if the token is valid and matches the wallet
 */
export function hasValidSession(walletAddress: string): boolean {
  const status = getAuthStatus();
  return status.isAuthenticated && status.wallet === walletAddress;
}

/**
 * Check if token needs refresh (expires in < 30 minutes)
 */
export function needsRefresh(): boolean {
  if (!tokenExpiry) return true;
  const thirtyMinutes = 30 * 60 * 1000;
  return Date.now() > tokenExpiry - thirtyMinutes;
}

// Auth event listeners for cross-component communication
type AuthEventType = 'auth:required' | 'auth:expired' | 'auth:success' | 'auth:logout';
const authListeners: Map<AuthEventType, Set<() => void>> = new Map();

export function onAuthEvent(event: AuthEventType, callback: () => void): () => void {
  if (!authListeners.has(event)) {
    authListeners.set(event, new Set());
  }
  authListeners.get(event)!.add(callback);
  
  // Return unsubscribe function
  return () => {
    authListeners.get(event)?.delete(callback);
  };
}

function emitAuthEvent(event: AuthEventType) {
  authListeners.get(event)?.forEach(cb => cb());
}

/**
 * Make an authenticated API request
 */
export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Check if token is expired before making request
  const status = getAuthStatus();
  if (status.isExpired && authToken) {
    console.warn('[Auth] Token expired, clearing auth');
    clearAuth();
    emitAuthEvent('auth:expired');
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If we get a 401, handle auth errors
  if (response.status === 401) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.requiresAuth) {
      clearAuth();
      emitAuthEvent('auth:required');
    } else if (data.error?.includes('expired')) {
      clearAuth();
      emitAuthEvent('auth:expired');
    }
  }

  return response;
}

/**
 * Sign a sensitive action (for withdrawals)
 */
export async function signSensitiveAction(
  wallet: WalletContextState,
  action: string,
  amount: number
): Promise<{ signature: string; timestamp: number } | null> {
  if (!wallet.publicKey || !wallet.signMessage) {
    return null;
  }

  const timestamp = Date.now();
  const walletAddress = wallet.publicKey.toBase58();
  const message = `ORE Supply Game ${action}\nWallet: ${walletAddress}\nAmount: ${amount}\nTimestamp: ${timestamp}`;

  try {
    const messageBytes = new TextEncoder().encode(message);
    const signature = await wallet.signMessage(messageBytes);
    return {
      signature: bs58.encode(signature),
      timestamp,
    };
  } catch (error) {
    console.error('[Auth] Failed to sign sensitive action:', error);
    return null;
  }
}

export default {
  getAuthStatus,
  getAuthHeaders,
  getAuthToken,
  authenticate,
  clearAuth,
  hasValidSession,
  needsRefresh,
  authFetch,
  signSensitiveAction,
  onAuthEvent,
};
