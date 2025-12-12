/**
 * Lottery Hook - WebSocket-based real-time lottery updates
 * Replaces HTTP polling with WebSocket for instant updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/use-web-socket';

export interface LotteryMachine {
  id: string;
  name: string;
  programId: string;
  machineAddress: string;
  paymentMint: string;
  tokenSymbol: string;
  tokenDecimals: number;
  baseBallPrice: number;
  isActive: boolean;
  isPaused: boolean;
  roundDuration: number;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    icon: string;
  };
}

interface RoundStatus {
  roundNumber: number;
  status: 'Active' | 'Ended' | 'Finalized' | 'Unknown';
  startTime: number;
  duration: number;
  endTime: number;
  totalBalls: number;
  totalPrize: number;
  prizePool: number;
  timeRemaining: number;
  participantCount: number;
}

interface LotteryStatus {
  machine: {
    address: string;
    name: string;
    currentRound: number;
    ballPrice: number;
    paymentMint: string;
  };
  currentRound: RoundStatus | null;
  previousRounds: RoundStatus[];
}

interface UserTickets {
  walletAddress: string;
  machineId: string;
  currentRound: {
    roundNumber: number;
    tickets: number[];
    ticketCount: number;
  } | null;
  totalTickets: number;
}

interface RoundResult {
  roundNumber: number;
  winners: Array<{ wallet: string; prize: number }>;
  vrfVerified: boolean;
}

export function useLottery(machineId: string = 'sol') {
  const { isConnected, emit, on, off } = useWebSocket();
  
  const [status, setStatus] = useState<LotteryStatus | null>(null);
  const [machines, setMachines] = useState<LotteryMachine[]>([]);
  const [userTickets, setUserTickets] = useState<UserTickets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<RoundResult | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  
  // Track pending callbacks for WebSocket responses
  const pendingCallbacks = useRef<Map<string, (data: any) => void>>(new Map());

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    // Handle lottery status updates
    const handleLotteryStatus = (data: LotteryStatus) => {
      console.log('[Lottery WS] Status received:', data);
      setStatus(data);
      setError(null);
      setLoading(false);
    };

    // Handle lottery updates (real-time)
    const handleLotteryUpdate = (data: LotteryStatus) => {
      console.log('[Lottery WS] Update received:', data);
      setStatus(data);
    };

    // Handle purchase success
    const handlePurchaseSuccess = (data: any) => {
      console.log('[Lottery WS] Purchase success:', data);
      setPurchasing(false);
      // Resolve any pending callback
      const callback = pendingCallbacks.current.get('purchase');
      if (callback) {
        callback(data);
        pendingCallbacks.current.delete('purchase');
      }
    };

    // Handle lottery errors
    const handleLotteryError = (data: any) => {
      console.error('[Lottery WS] Error:', data);
      setError(data.message);
      setPurchasing(false);
      // Reject any pending callback
      const callback = pendingCallbacks.current.get('purchase_error');
      if (callback) {
        callback(data);
        pendingCallbacks.current.delete('purchase_error');
      }
    };

    // Handle user tickets
    const handleLotteryTickets = (data: UserTickets) => {
      console.log('[Lottery WS] Tickets received:', data);
      setUserTickets(data);
    };

    // Handle round finalized
    const handleRoundFinalized = (data: RoundResult) => {
      console.log('[Lottery WS] Round finalized:', data);
      setLastRoundResult(data);
    };

    // Handle round started
    const handleRoundStarted = (data: any) => {
      console.log('[Lottery WS] New round started:', data);
      // Request fresh status
      emit('lottery:get_status', { machineId });
    };

    // Handle winners
    const handleLotteryWinners = (data: any) => {
      console.log('[Lottery WS] Winners received:', data);
      const callback = pendingCallbacks.current.get('winners');
      if (callback) {
        callback(data.winners || []);
        pendingCallbacks.current.delete('winners');
      }
    };

    // Register event listeners
    on('lottery:status', handleLotteryStatus);
    on('lottery:update', handleLotteryUpdate);
    on('lottery:purchase_success', handlePurchaseSuccess);
    on('lottery:error', handleLotteryError);
    on('lottery:tickets', handleLotteryTickets);
    on('lottery:roundFinalized', handleRoundFinalized);
    on('lottery:roundStarted', handleRoundStarted);
    on('lottery:winners', handleLotteryWinners);

    // Request initial status
    emit('lottery:get_status', { machineId });

    return () => {
      off('lottery:status', handleLotteryStatus);
      off('lottery:update', handleLotteryUpdate);
      off('lottery:purchase_success', handlePurchaseSuccess);
      off('lottery:error', handleLotteryError);
      off('lottery:tickets', handleLotteryTickets);
      off('lottery:roundFinalized', handleRoundFinalized);
      off('lottery:roundStarted', handleRoundStarted);
      off('lottery:winners', handleLotteryWinners);
    };
  }, [isConnected, machineId, emit, on, off]);

  // Request lottery status via WebSocket
  const fetchStatus = useCallback(() => {
    if (!isConnected) {
      console.warn('[Lottery] WebSocket not connected');
      return;
    }
    setLoading(true);
    emit('lottery:get_status', { machineId });
  }, [isConnected, machineId, emit]);

  // Fetch user tickets via WebSocket
  const fetchUserTickets = useCallback((walletAddress: string) => {
    if (!isConnected) {
      console.warn('[Lottery] WebSocket not connected');
      return;
    }
    emit('lottery:get_tickets', { walletAddress, machineId });
  }, [isConnected, machineId, emit]);

  // Buy balls using WebSocket (SOL payment)
  const buyBalls = useCallback(async (walletAddress: string, quantity: number): Promise<any> => {
    if (!isConnected) {
      throw new Error('WebSocket not connected');
    }
    
    setPurchasing(true);
    setError(null);
    
    return new Promise((resolve, reject) => {
      // Set up callbacks
      pendingCallbacks.current.set('purchase', resolve);
      pendingCallbacks.current.set('purchase_error', (data) => reject(new Error(data.message)));
      
      // Emit the buy event
      emit('lottery:buy_balls', { walletAddress, machineId, quantity });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingCallbacks.current.has('purchase')) {
          pendingCallbacks.current.delete('purchase');
          pendingCallbacks.current.delete('purchase_error');
          setPurchasing(false);
          reject(new Error('Purchase timeout'));
        }
      }, 30000);
    });
  }, [isConnected, machineId, emit]);

  // Buy balls with token using WebSocket
  const buyBallsWithToken = useCallback(async (walletAddress: string, quantity: number): Promise<any> => {
    if (!isConnected) {
      throw new Error('WebSocket not connected');
    }
    
    setPurchasing(true);
    setError(null);
    
    return new Promise((resolve, reject) => {
      // Set up callbacks
      pendingCallbacks.current.set('purchase', resolve);
      pendingCallbacks.current.set('purchase_error', (data) => reject(new Error(data.message)));
      
      // Emit the buy event
      emit('lottery:buy_balls_token', { walletAddress, machineId, quantity });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingCallbacks.current.has('purchase')) {
          pendingCallbacks.current.delete('purchase');
          pendingCallbacks.current.delete('purchase_error');
          setPurchasing(false);
          reject(new Error('Purchase timeout'));
        }
      }, 30000);
    });
  }, [isConnected, machineId, emit]);

  // Fetch winners for a round via WebSocket
  const fetchWinners = useCallback(async (roundNumber: number): Promise<any[]> => {
    if (!isConnected) {
      console.warn('[Lottery] WebSocket not connected');
      return [];
    }
    
    return new Promise((resolve) => {
      pendingCallbacks.current.set('winners', resolve);
      emit('lottery:get_winners', { roundNumber, machineId });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (pendingCallbacks.current.has('winners')) {
          pendingCallbacks.current.delete('winners');
          resolve([]);
        }
      }, 10000);
    });
  }, [isConnected, machineId, emit]);

  // Legacy: Prepare buy balls (not used with WebSocket, kept for compatibility)
  const prepareBuyBalls = useCallback(async (walletAddress: string, quantity: number) => {
    console.warn('[Lottery] prepareBuyBalls is deprecated, use buyBalls instead');
    return buyBalls(walletAddress, quantity);
  }, [buyBalls]);

  // Fetch round data (kept for compatibility, uses HTTP fallback)
  const fetchRound = useCallback(async (roundId: number) => {
    // For now, just return from current status if available
    if (status?.currentRound && status.currentRound.roundNumber === roundId) {
      return status.currentRound;
    }
    return null;
  }, [status]);

  // Fetch history (kept for compatibility)
  const fetchHistory = useCallback(async (limit: number = 10) => {
    return status?.previousRounds?.slice(0, limit) || [];
  }, [status]);

  // Fetch machines from API
  const fetchMachines = useCallback(async (): Promise<LotteryMachine[]> => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3920';
      const response = await fetch(`${API_URL}/lottery/machines`);
      if (!response.ok) throw new Error('Failed to fetch machines');
      const data = await response.json();
      const fetchedMachines = data.machines || [];
      setMachines(fetchedMachines);
      return fetchedMachines;
    } catch (err: any) {
      console.error('[Lottery] Error fetching machines:', err);
      return machines;
    }
  }, [machines]);

  // Get current machine info
  const currentMachine = machines.find(m => m.id === machineId) || null;

  return {
    // State
    status,
    machines,
    currentMachine,
    userTickets,
    loading,
    error,
    purchasing,
    lastRoundResult,
    isConnected,
    machineId,
    
    // Actions
    fetchStatus,
    fetchUserTickets,
    fetchMachines,
    buyBalls,
    buyBallsWithToken,
    fetchWinners,
    fetchRound,
    fetchHistory,
    prepareBuyBalls, // Legacy compatibility
  };
}

export default useLottery;
