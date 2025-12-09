import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { authFetch } from '@/lib/auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_API_URL ||
  'http://localhost:3920';

export interface MarketplaceListing {
  id: string;
  machineId: string;
  roundNumber: number;
  ballId: number;
  sellerWallet: string;
  price: number;
  priceToken: string;
  status: 'active' | 'sold' | 'cancelled';
  buyerWallet?: string;
  txSignature?: string;
  listedAt: number;
  soldAt?: number;
}

export interface PlayerBall {
  ballId: number;
  listedForSale: boolean;
  listingId?: string;
}

export interface PlayerInventory {
  walletAddress: string;
  machineId: string;
  roundNumber: number;
  balls: PlayerBall[];
  lastUpdated: number;
}

export interface MarketplaceStats {
  activeListings: number;
  totalVolume: number;
  totalSales: number;
  avgPrice: number;
}

export function useMarketplace() {
  const { publicKey } = useWallet();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [inventory, setInventory] = useState<PlayerInventory[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active marketplace listings
  const fetchListings = useCallback(async (machineId?: string, roundNumber?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (machineId) params.append('machineId', machineId);
      if (roundNumber) params.append('roundNumber', roundNumber.toString());
      
      const response = await fetch(`${API_URL}/marketplace/listings?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setListings(data.listings || []);
      } else {
        setError(data.error || 'Failed to fetch listings');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch player's inventory
  const fetchInventory = useCallback(async (machineId?: string, roundNumber?: number) => {
    if (!publicKey) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (machineId) params.append('machineId', machineId);
      if (roundNumber) params.append('roundNumber', roundNumber.toString());
      
      const response = await fetch(`${API_URL}/inventory/${publicKey.toString()}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setInventory(data.inventory || []);
        setMyListings(data.activeListings || []);
      } else {
        setError(data.error || 'Failed to fetch inventory');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Fetch marketplace stats
  const fetchStats = useCallback(async (machineId?: string) => {
    try {
      const params = machineId ? `?machineId=${machineId}` : '';
      const response = await fetch(`${API_URL}/marketplace/stats${params}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // List a ball for sale
  const listBall = useCallback(async (
    machineId: string,
    roundNumber: number,
    ballId: number,
    priceInSol: number
  ): Promise<{ success: boolean; listing?: MarketplaceListing; message: string }> => {
    if (!publicKey) {
      return { success: false, message: 'Wallet not connected' };
    }

    try {
      const response = await authFetch('/marketplace/list', {
        method: 'POST',
        body: JSON.stringify({
          sellerWallet: publicKey.toString(),
          machineId,
          roundNumber,
          ballId,
          price: priceInSol,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh inventory
        await fetchInventory(machineId, roundNumber);
        await fetchListings(machineId, roundNumber);
      }
      
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [publicKey, fetchInventory, fetchListings]);

  // Delist a ball (cancel listing)
  const delistBall = useCallback(async (
    listingId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!publicKey) {
      return { success: false, message: 'Wallet not connected' };
    }

    try {
      const response = await authFetch('/marketplace/delist', {
        method: 'POST',
        body: JSON.stringify({
          sellerWallet: publicKey.toString(),
          listingId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh data
        await fetchInventory();
        await fetchListings();
      }
      
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [publicKey, fetchInventory, fetchListings]);

  // Buy a ball from marketplace
  const buyBall = useCallback(async (
    listingId: string
  ): Promise<{ success: boolean; txSignature?: string; message: string }> => {
    if (!publicKey) {
      return { success: false, message: 'Wallet not connected' };
    }

    try {
      const response = await authFetch('/marketplace/buy', {
        method: 'POST',
        body: JSON.stringify({
          buyerWallet: publicKey.toString(),
          listingId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh data
        await fetchInventory();
        await fetchListings();
        await fetchStats();
      }
      
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [publicKey, fetchInventory, fetchListings, fetchStats]);

  // Get total balls count
  const totalBalls = inventory.reduce((sum, inv) => sum + inv.balls.length, 0);
  const listedBalls = inventory.reduce(
    (sum, inv) => sum + inv.balls.filter(b => b.listedForSale).length, 
    0
  );

  return {
    // State
    listings,
    inventory,
    myListings,
    stats,
    loading,
    error,
    totalBalls,
    listedBalls,
    
    // Actions
    fetchListings,
    fetchInventory,
    fetchStats,
    listBall,
    delistBall,
    buyBall,
  };
}

export default useMarketplace;
