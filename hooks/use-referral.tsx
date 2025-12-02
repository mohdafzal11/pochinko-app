/**
 * Referral Hook - Manages referral codes, stats, and rewards
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const API_URL = process.env.NEXT_API_URL || 'http://localhost:3920';

interface ReferralStats {
  referralCode: string | null;
  totalReferred: number;
  activeReferrals: number;
  totalEarnings: number;
  unclaimedEarnings: number;
  claimedEarnings: number;
  canClaim: boolean;
  nextClaimTime: number | null;
}

interface ReferralEarning {
  referrer: string;
  fromUser: string;
  winAmount: number;
  referralAmount: number;
  game: 'ore' | 'lottery';
  roundId: number;
  timestamp: number;
  claimed: boolean;
}

interface UnclaimedEarnings {
  total: number;
  earnings: ReferralEarning[];
  canClaim: boolean;
  nextClaimTime: number | null;
}

interface LeaderboardEntry {
  wallet: string;
  totalReferred: number;
  totalEarnings: number;
}

export function useReferral() {
  const { publicKey } = useWallet();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [earnings, setEarnings] = useState<UnclaimedEarnings | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get or generate referral code
  const getMyReferralCode = useCallback(async (): Promise<string | null> => {
    if (!publicKey) return null;
    
    try {
      const response = await fetch(`${API_URL}/referral/code/${publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to get referral code');
      const data = await response.json();
      return data.code;
    } catch (err: any) {
      console.error('Error getting referral code:', err);
      return null;
    }
  }, [publicKey]);

  // Register with a referral code
  const registerWithCode = useCallback(async (referralCode: string): Promise<boolean> => {
    if (!publicKey) return false;
    
    try {
      const response = await fetch(`${API_URL}/referral/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode,
          walletAddress: publicKey.toString(),
        }),
      });
      
      const data = await response.json();
      return data.success === true;
    } catch (err: any) {
      console.error('Error registering referral:', err);
      return false;
    }
  }, [publicKey]);

  // Fetch referral stats
  const fetchStats = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/referral/stats/${publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching referral stats:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Fetch unclaimed earnings
  const fetchEarnings = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`${API_URL}/referral/earnings/${publicKey.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch earnings');
      const data = await response.json();
      setEarnings(data);
    } catch (err: any) {
      console.error('Error fetching earnings:', err);
    }
  }, [publicKey]);

  // Claim referral rewards
  const claimRewards = useCallback(async (): Promise<{ success: boolean; amount: number; message: string }> => {
    if (!publicKey) {
      return { success: false, amount: 0, message: 'Wallet not connected' };
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/referral/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toString() }),
      });
      
      const data = await response.json();
      
      // Refresh stats after claiming
      if (data.success) {
        await fetchStats();
        await fetchEarnings();
      }
      
      return data;
    } catch (err: any) {
      console.error('Error claiming rewards:', err);
      return { success: false, amount: 0, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [publicKey, fetchStats, fetchEarnings]);

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async (limit: number = 10) => {
    try {
      const response = await fetch(`${API_URL}/referral/leaderboard?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (err: any) {
      console.error('Error fetching leaderboard:', err);
    }
  }, []);

  // Generate shareable referral link
  const getReferralLink = useCallback((code: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}?ref=${code}`;
  }, []);

  // Auto-fetch stats when wallet connects
  useEffect(() => {
    if (publicKey) {
      fetchStats();
      fetchEarnings();
    } else {
      setStats(null);
      setEarnings(null);
    }
  }, [publicKey, fetchStats, fetchEarnings]);

  // Format time until next claim
  const formatNextClaimTime = useCallback((timestamp: number | null): string => {
    if (!timestamp) return 'Available now';
    
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff <= 0) return 'Available now';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }, []);

  return {
    stats,
    earnings,
    leaderboard,
    loading,
    error,
    getMyReferralCode,
    registerWithCode,
    fetchStats,
    fetchEarnings,
    claimRewards,
    fetchLeaderboard,
    getReferralLink,
    formatNextClaimTime,
  };
}

export default useReferral;
