'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Tag,
  Loader2,
  Package,
  TrendingUp,
  DollarSign,
  RefreshCw,
  X,
  ArrowLeft,
  Sparkles,
  Wallet,
  CircleDot,
  Store,
  Coins,
} from 'lucide-react';
import Link from 'next/link';
import { useUnifiedWallet } from '@/hooks/use-unified-wallet';
import useMarketplace from '@/hooks/use-marketplace';
import { authFetch, getAuthStatus, authenticate } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3920';

interface Ball {
  ballId: number;
  listedForSale: boolean;
  listingId?: string;
}

interface InventoryData {
  walletAddress: string;
  machineId: string;
  roundNumber: number;
  balls: Ball[];
  lastUpdated: number;
}

interface Listing {
  id: string;
  machineId: string;
  roundNumber: number;
  ballId: number;
  sellerWallet: string;
  price: number;
  priceToken: string;
  status: string;
  listedAt: number;
}

interface MarketStats {
  activeListings: number;
  totalVolume: number;
  totalSales: number;
  avgPrice: number;
}

type Tab = 'marketplace' | 'inventory';

export default function Marketplace() {
  const wallet = useWallet();
  const { publicKey } = wallet;

  const [activeTab, setActiveTab] = useState<Tab>('marketplace');
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [sortBy, setSortBy] = useState<'price' | 'date'>('price');
  const [filterRound, setFilterRound] = useState<number | null>(null);

  // Inventory state
  const [inventory, setInventory] = useState<InventoryData[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [selectedBall, setSelectedBall] = useState<{ ball: Ball; roundNumber: number; machineId: string } | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [listing, setListing] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const {
    balance: unifiedBalance,
    accountExists,
    loading: walletLoading,
    fetchBalance: refreshBalance,
  } = useUnifiedWallet();

  // Use marketplace hook for on-chain transactions
  const { buyBall: buyBallOnChain } = useMarketplace();

  // Fetch marketplace listings
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRound) params.append('roundNumber', filterRound.toString());

      const response = await fetch(`${API_URL}/marketplace/listings?${params}`);
      const data = await response.json();

      if (data.success) {
        setListings(data.listings || []);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  }, [filterRound]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/marketplace/stats`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Fetch inventory
  const fetchInventory = useCallback(async () => {
    if (!publicKey) return;

    const authStatus = getAuthStatus();
    if (!authStatus.isAuthenticated || authStatus.wallet !== publicKey.toString()) {
      return;
    }

    try {
      const response = await authFetch(`/inventory/${publicKey.toString()}`);
      const data = await response.json();

      if (data.success) {
        setInventory(data.inventory || []);
        setMyListings(data.activeListings || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchListings();
    fetchStats();
  }, [fetchListings, fetchStats]);

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [activeTab, fetchInventory]);

  // Handle authentication
  const handleAuthenticate = async () => {
    if (!publicKey || !wallet.signMessage) return;

    setAuthenticating(true);
    try {
      const result = await authenticate(wallet);
      if (result.success) {
        toast.success('Authenticated successfully!');
        fetchInventory();
      } else {
        toast.error(result.error || 'Authentication failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  // Buy a ball (on-chain with server authorization)
  const handleBuyBall = async (listingItem: Listing) => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (listingItem.sellerWallet === publicKey.toString()) {
      toast.error('Cannot buy your own listing');
      return;
    }

    const priceInSol = listingItem.price / 1e9;
    if (unifiedBalance < priceInSol) {
      toast.error(`Insufficient balance. Need ${priceInSol.toFixed(4)} SOL`);
      return;
    }

    setBuying(listingItem.id);
    toast.info('Preparing transaction...');
    
    try {
      const result = await buyBallOnChain(listingItem.id);

      if (result.success) {
        toast.success(
          <div>
            <div className="font-bold">Ball #{listingItem.ballId} purchased!</div>
            <div className="text-xs opacity-80 mt-1">Transaction: {result.txSignature?.slice(0, 8)}...</div>
          </div>
        );
        fetchListings();
        fetchStats();
        fetchInventory();
        refreshBalance();
      } else {
        toast.error(result.message || 'Purchase failed');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Purchase failed');
    } finally {
      setBuying(null);
    }
  };

  // List ball for sale
  const handleListBall = async () => {
    if (!publicKey || !selectedBall) return;

    const authStatus = getAuthStatus();
    if (!authStatus.isAuthenticated || authStatus.wallet !== publicKey.toString()) {
      toast.error('Please authenticate first');
      return;
    }

    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setListing(true);
    try {
      const response = await authFetch('/marketplace/list', {
        method: 'POST',
        body: JSON.stringify({
          sellerWallet: publicKey.toString(),
          machineId: selectedBall.machineId,
          roundNumber: selectedBall.roundNumber,
          ballId: selectedBall.ball.ballId,
          price,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Ball #${selectedBall.ball.ballId} listed for ${price} SOL`);
        setSelectedBall(null);
        setListPrice('');
        fetchInventory();
        fetchListings();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to list ball');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to list ball');
    } finally {
      setListing(false);
    }
  };

  // Cancel listing
  const handleCancelListing = async (listingItem: Listing) => {
    if (!publicKey) return;

    const authStatus = getAuthStatus();
    if (!authStatus.isAuthenticated || authStatus.wallet !== publicKey.toString()) {
      toast.error('Please authenticate first');
      return;
    }

    try {
      const response = await authFetch('/marketplace/delist', {
        method: 'POST',
        body: JSON.stringify({
          sellerWallet: publicKey.toString(),
          listingId: listingItem.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Listing cancelled');
        fetchInventory();
        fetchListings();
        fetchStats();
      } else {
        toast.error(data.error || 'Failed to cancel listing');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel listing');
    }
  };

  // Sort listings
  const sortedListings = [...listings].sort((a, b) => {
    if (sortBy === 'price') return a.price - b.price;
    return b.listedAt - a.listedAt;
  });

  // Get unique rounds for filter
  const uniqueRounds = [...new Set(listings.map((l) => l.roundNumber))].sort((a, b) => b - a);

  // Stats
  const totalBalls = inventory.reduce((sum, inv) => sum + inv.balls.length, 0);
  const listedBalls = myListings.length;

  const isAuthenticated = getAuthStatus().isAuthenticated && getAuthStatus().wallet === publicKey?.toString();

  return (
    <div className="min-h-screen font-mono bg-gradient-to-br from-gray-50 to-orange-50/30">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-10 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl"
        />
        <motion.div
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-40 right-20 w-48 h-48 bg-purple-200/20 rounded-full blur-3xl"
        />
      </div>

      <div className="relative container mx-auto px-4 lg:px-8 pt-8 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <Link href="/pachinko">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Game
              </Button>
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                <Store className="w-10 h-10 text-orange-500" />
                Pachinko Marketplace
              </h1>
              <p className="text-gray-600 mt-2">Buy and sell lottery balls • Trade with other players</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Balance:</span>
                  <span className="font-bold text-gray-800">{unifiedBalance.toFixed(4)} SOL</span>
                </div>
              </div>
              <WalletMultiButton style={{
                backgroundColor: 'white',
                color: "black",
                borderRadius: '0.9rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                height: "40px"
              }} />
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Active Listings</p>
                  <p className="text-3xl font-bold text-gray-800">{stats?.activeListings ?? 0}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Tag className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Total Sales</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.totalSales ?? 0}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Volume</p>
                  <p className="text-3xl font-bold text-orange-500">
                    {stats?.totalVolume ? (stats.totalVolume / 1e9).toFixed(2) : '0'} <span className="text-lg">SOL</span>
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Avg Price</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats?.avgPrice ? (stats.avgPrice / 1e9).toFixed(4) : '0'} <span className="text-lg">SOL</span>
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2 mb-6"
        >
          <Button
            variant={activeTab === 'marketplace' ? 'default' : 'outline'}
            onClick={() => setActiveTab('marketplace')}
            className={`${activeTab === 'marketplace'
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Store className="w-4 h-4 mr-2" />
            Browse Marketplace
          </Button>
          <Button
            variant={activeTab === 'inventory' ? 'default' : 'outline'}
            onClick={() => setActiveTab('inventory')}
            className={`${activeTab === 'inventory'
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Package className="w-4 h-4 mr-2" />
            My Inventory
            {totalBalls > 0 && (
              <Badge className="ml-2 bg-white/20 text-white">{totalBalls}</Badge>
            )}
          </Button>

          <div className="ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetchListings();
                fetchStats();
                fetchInventory();
              }}
              className="text-gray-600 hover:text-gray-800"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* Marketplace Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'marketplace' && (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm font-medium">Sort:</span>
                  <Button
                    variant={sortBy === 'price' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('price')}
                    className={sortBy === 'price' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                  >
                    Lowest Price
                  </Button>
                  <Button
                    variant={sortBy === 'date' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortBy('date')}
                    className={sortBy === 'date' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
                  >
                    Newest
                  </Button>
                </div>

                {uniqueRounds.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm font-medium">Round:</span>
                    <Button
                      variant={filterRound === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterRound(null)}
                      className={filterRound === null ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                    >
                      All
                    </Button>
                    {uniqueRounds.slice(0, 5).map((round) => (
                      <Button
                        key={round}
                        variant={filterRound === round ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterRound(round)}
                        className={filterRound === round ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}
                      >
                        #{round}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Listings Grid */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                </div>
              ) : sortedListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {sortedListings.map((listingItem, index) => {
                    const isOwnListing = publicKey?.toString() === listingItem.sellerWallet;
                    const priceInSol = listingItem.price / 1e9;
                    const canAfford = unifiedBalance >= priceInSol;

                    return (
                      <motion.div
                        key={listingItem.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card
                          className={`bg-white/90 backdrop-blur-sm border-gray-200 overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 ${isOwnListing ? 'ring-2 ring-orange-400' : ''
                            }`}
                        >
                          {/* Ball Visualization */}
                          <div className="relative h-28 bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center">
                            <motion.div
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-lg flex items-center justify-center"
                            >
                              <span className="text-white font-bold text-lg">#{listingItem.ballId}</span>
                            </motion.div>
                            <Badge className="absolute top-2 right-2 bg-purple-600 text-white">
                              Round #{listingItem.roundNumber}
                            </Badge>
                          </div>

                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Price</span>
                                <span className="text-xl font-bold text-gray-800">{priceInSol.toFixed(4)} SOL</span>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">Seller</span>
                                <span className="text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                                  {listingItem.sellerWallet.slice(0, 4)}...{listingItem.sellerWallet.slice(-4)}
                                </span>
                              </div>

                              {isOwnListing ? (
                                <Button
                                  variant="outline"
                                  className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                                  onClick={() => handleCancelListing(listingItem)}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Cancel Listing
                                </Button>
                              ) : (
                                <Button
                                  className={`w-full ${canAfford
                                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                    }`}
                                  onClick={() => handleBuyBall(listingItem)}
                                  disabled={!publicKey || buying === listingItem.id || !canAfford}
                                >
                                  {buying === listingItem.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  ) : (
                                    <ShoppingCart className="w-4 h-4 mr-2" />
                                  )}
                                  {!publicKey ? 'Connect Wallet' : !canAfford ? 'Insufficient' : 'Buy Now'}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                  <CardContent className="py-16 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Listings Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Be the first to list your balls for sale!
                    </p>
                    <Button
                      onClick={() => setActiveTab('inventory')}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Go to Inventory
                    </Button>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {!publicKey ? (
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200 max-w-md mx-auto">
                  <CardContent className="py-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                      <Wallet className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Connect Wallet</h3>
                    <p className="text-gray-600 mb-6">Connect your wallet to view and manage your inventory</p>
                    <WalletMultiButton />
                  </CardContent>
                </Card>
              ) : !isAuthenticated ? (
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200 max-w-md mx-auto">
                  <CardContent className="py-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-orange-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-orange-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h3>
                    <p className="text-gray-600 mb-6">Sign a message to verify your wallet ownership</p>
                    <Button
                      onClick={handleAuthenticate}
                      disabled={authenticating}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {authenticating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      {authenticating ? 'Authenticating...' : 'Authenticate'}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Inventory Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-500 text-xs uppercase">Total Balls</p>
                            <p className="text-3xl font-bold text-gray-800">{totalBalls}</p>
                          </div>
                          <div className="p-3 bg-blue-100 rounded-xl">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-500 text-xs uppercase">Listed for Sale</p>
                            <p className="text-3xl font-bold text-orange-500">{listedBalls}</p>
                          </div>
                          <div className="p-3 bg-orange-100 rounded-xl">
                            <Tag className="w-6 h-6 text-orange-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-500 text-xs uppercase">Available</p>
                            <p className="text-3xl font-bold text-green-600">{totalBalls - listedBalls}</p>
                          </div>
                          <div className="p-3 bg-green-100 rounded-xl">
                            <CircleDot className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Active Listings */}
                  {myListings.length > 0 && (
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                      <CardHeader>
                        <CardTitle className="text-gray-800 flex items-center gap-2">
                          <Tag className="w-5 h-5 text-orange-500" />
                          Your Active Listings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {myListings.map((listingItem) => (
                            <div
                              key={listingItem.id}
                              className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-200"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">#{listingItem.ballId}</span>
                                </div>
                                <div>
                                  <p className="text-gray-800 font-medium">Ball #{listingItem.ballId}</p>
                                  <p className="text-gray-500 text-xs">Round #{listingItem.roundNumber}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className="bg-orange-200 text-orange-700">
                                  {(listingItem.price / 1e9).toFixed(4)} SOL
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancelListing(listingItem)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Inventory by Round */}
                  {inventory.length > 0 ? (
                    inventory.map((inv) => (
                      <Card key={`${inv.machineId}-${inv.roundNumber}`} className="bg-white/80 backdrop-blur-sm border-gray-200">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-gray-800 flex items-center gap-2">
                              <Coins className="w-5 h-5 text-purple-600" />
                              Round #{inv.roundNumber}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-purple-500/50 text-purple-600">
                                {inv.balls.length} balls
                              </Badge>
                              <Badge variant="outline" className="border-gray-300 text-gray-600">
                                {inv.machineId}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                            {inv.balls.map((ball) => (
                              <motion.div
                                key={ball.ballId}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`relative p-3 rounded-xl text-center cursor-pointer transition-all ${ball.listedForSale
                                    ? 'bg-orange-100 border-2 border-orange-300'
                                    : selectedBall?.ball.ballId === ball.ballId &&
                                      selectedBall?.roundNumber === inv.roundNumber
                                      ? 'bg-blue-100 border-2 border-blue-400 ring-2 ring-blue-200'
                                      : 'bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                  }`}
                                onClick={() =>
                                  !ball.listedForSale &&
                                  setSelectedBall({ ball, roundNumber: inv.roundNumber, machineId: inv.machineId })
                                }
                              >
                                <div
                                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold text-sm ${ball.listedForSale
                                      ? 'bg-gradient-to-br from-orange-400 to-orange-600'
                                      : 'bg-gradient-to-br from-purple-400 to-purple-600'
                                    }`}
                                >
                                  #{ball.ballId}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">{ball.listedForSale ? 'Listed' : 'Available'}</p>
                              </motion.div>
                            ))}
                          </div>

                          {/* List Ball Form */}
                          <AnimatePresence>
                            {selectedBall && selectedBall.roundNumber === inv.roundNumber && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200"
                              >
                                <h4 className="text-gray-800 font-semibold mb-4 flex items-center gap-2">
                                  <Tag className="w-4 h-4 text-blue-600" />
                                  List Ball #{selectedBall.ball.ballId} for Sale
                                </h4>
                                <div className="flex gap-3">
                                  <div className="flex-1">
                                    <Input
                                      type="number"
                                      placeholder="Price in SOL (e.g., 0.5)"
                                      value={listPrice}
                                      onChange={(e) => setListPrice(e.target.value)}
                                      className="bg-white border-gray-300"
                                      step="0.001"
                                      min="0.001"
                                    />
                                  </div>
                                  <Button
                                    onClick={handleListBall}
                                    disabled={listing || !listPrice || parseFloat(listPrice) <= 0}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    {listing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    List for Sale
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedBall(null);
                                      setListPrice('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200">
                      <CardContent className="py-16 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">No Balls in Inventory</h3>
                        <p className="text-gray-600 mb-4">
                          Buy some balls from the Pachinko game or marketplace!
                        </p>
                        <div className="flex justify-center gap-3">
                          <Link href="/pachinko">
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                              <Sparkles className="w-4 h-4 mr-2" />
                              Play Pachinko
                            </Button>
                          </Link>
                          <Button variant="outline" onClick={() => setActiveTab('marketplace')}>
                            <Store className="w-4 h-4 mr-2" />
                            Browse Marketplace
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 mt-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-gray-800 font-semibold mb-1">Marketplace Fees</h3>
                  <p className="text-gray-600 text-sm">
                    All sales have a <span className="font-semibold text-orange-600">10% marketplace fee</span> that goes to
                    the treasury. Sellers receive 90% of the sale price. All transactions are processed through the Unified
                    Wallet for instant settlement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
