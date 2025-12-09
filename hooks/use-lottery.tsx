/**
 * Lottery Hook - Connects to unified backend lottery endpoints
 */

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/auth';

const API_URL = process.env.NEXT_API_URL || 'http://localhost:3920';

interface LotteryMachine {
  id: string;
  address: string;
  name: string;
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

export function useLottery(machineId: string = 'sol') {
  const [status, setStatus] = useState<LotteryStatus | null>(null);
  const [machines, setMachines] = useState<LotteryMachine[]>([]);
  const [userTickets, setUserTickets] = useState<UserTickets | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch lottery status
  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/lottery/status?machineId=${machineId}`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching lottery status:', err);
    } finally {
      setLoading(false);
    }
  }, [machineId]);

  // Fetch all machines
  const fetchMachines = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/lottery/machines`);
      if (!response.ok) throw new Error('Failed to fetch machines');
      const data = await response.json();
      setMachines(data.machines || []);
    } catch (err: any) {
      console.error('Error fetching machines:', err);
    }
  }, []);

  // Fetch user tickets
  const fetchUserTickets = useCallback(async (walletAddress: string) => {
    try {
      const response = await fetch(
        `${API_URL}/lottery/user/${walletAddress}/tickets?machineId=${machineId}`
      );
      if (!response.ok) throw new Error('Failed to fetch tickets');
      const data = await response.json();
      setUserTickets(data);
    } catch (err: any) {
      console.error('Error fetching user tickets:', err);
    }
  }, [machineId]);

  // Buy balls using unified wallet SOL (server-side debit)
  // Requires JWT authentication
  const buyBalls = useCallback(async (walletAddress: string, quantity: number) => {
    try {
      const response = await authFetch('/lottery/buy-balls', {
        method: 'POST',
        body: JSON.stringify({ walletAddress, machineId, quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to buy balls');
      return data;
    } catch (err: any) {
      console.error('Error buying balls:', err);
      throw err;
    }
  }, [machineId]);

  // Buy balls using unified wallet tokens (server-side debit)
  // Requires JWT authentication
  const buyBallsWithToken = useCallback(async (walletAddress: string, quantity: number) => {
    try {
      const response = await authFetch('/lottery/buy-balls-token', {
        method: 'POST',
        body: JSON.stringify({ walletAddress, machineId, quantity }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to buy balls with tokens');
      return data;
    } catch (err: any) {
      console.error('Error buying balls with tokens:', err);
      throw err;
    }
  }, [machineId]);

  // Legacy: Prepare buy balls transaction for on-chain purchase
  const prepareBuyBalls = useCallback(async (walletAddress: string, quantity: number) => {
    try {
      const response = await fetch(`${API_URL}/lottery/prepare-buy-balls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, machineId, quantity }),
      });
      if (!response.ok) throw new Error('Failed to prepare transaction');
      return await response.json();
    } catch (err: any) {
      console.error('Error preparing buy balls:', err);
      throw err;
    }
  }, [machineId]);

  // Fetch round data
  const fetchRound = useCallback(async (roundId: number) => {
    try {
      const response = await fetch(
        `${API_URL}/lottery/round/${roundId}?machineId=${machineId}`
      );
      if (!response.ok) throw new Error('Failed to fetch round');
      return await response.json();
    } catch (err: any) {
      console.error('Error fetching round:', err);
      return null;
    }
  }, [machineId]);

  // Fetch round winners
  const fetchWinners = useCallback(async (roundId: number) => {
    try {
      const response = await fetch(
        `${API_URL}/lottery/round/${roundId}/winners?machineId=${machineId}`
      );
      if (!response.ok) throw new Error('Failed to fetch winners');
      const data = await response.json();
      return data.winners || [];
    } catch (err: any) {
      console.error('Error fetching winners:', err);
      return [];
    }
  }, [machineId]);

  // Fetch round history
  const fetchHistory = useCallback(async (limit: number = 10) => {
    try {
      const response = await fetch(
        `${API_URL}/lottery/history?machineId=${machineId}&limit=${limit}`
      );
      if (!response.ok) throw new Error('Failed to fetch history');
      const data = await response.json();
      return data.rounds || [];
    } catch (err: any) {
      console.error('Error fetching history:', err);
      return [];
    }
  }, [machineId]);

  // Auto-refresh status
  useEffect(() => {
    fetchStatus();
    fetchMachines();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchMachines]);

  return {
    status,
    machines,
    userTickets,
    loading,
    error,
    fetchStatus,
    fetchUserTickets,
    buyBalls,
    buyBallsWithToken,
    prepareBuyBalls, // Legacy
    fetchRound,
    fetchWinners,
    fetchHistory,
  };
}

export default useLottery;
