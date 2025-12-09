'use client'

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    ShoppingCart,
    Tag,
    Loader2,
    ArrowLeft,
    Package,
    TrendingUp,
    DollarSign,
    RefreshCw,
    CloudCog
} from 'lucide-react';
import Link from 'next/link';
const API_URL = process.env.NEXT_API_URL || 'http://localhost:3920';
import { useUnifiedWallet } from '@/hooks/use-unified-wallet';

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

const Marketplace = () => {
    const { publicKey } = useWallet();
    const [showWallet, setShowWallet] = useState(false);
    const [loading, setLoading] = useState(false);
    const [buying, setBuying] = useState<string | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [stats, setStats] = useState<MarketStats | null>(null);
    const [sortBy, setSortBy] = useState<'price' | 'date'>('price');
    const [filterRound, setFilterRound] = useState<number | null>(null);

    const {
        balance: unifiedBalance,
        accountExists,
        loading: walletLoading,
    } = useUnifiedWallet();

    // Fetch listings
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

    useEffect(() => {
        fetchListings();
        fetchStats();
    }, [fetchListings, fetchStats]);

    // Buy ball
    const handleBuy = async (listing: Listing) => {
        if (!publicKey) {
            toast.error('Please connect your wallet');
            return;
        }

        if (listing.sellerWallet === publicKey.toString()) {
            toast.error('Cannot buy your own listing');
            return;
        }

        const priceInSol = listing.price / 1e9;
        if (unifiedBalance < priceInSol) {
            toast.error(`Insufficient balance. Need ${priceInSol.toFixed(4)} SOL`);
            return;
        }

        setBuying(listing.id);
        try {
            const response = await fetch(`${API_URL}/marketplace/buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    buyerWallet: publicKey.toString(),
                    listingId: listing.id,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Successfully purchased Ball #${listing.ballId}!`);
                fetchListings();
                fetchStats();
            } else {
                toast.error(data.error || 'Purchase failed');
            }
        } catch (error: any) {
            toast.error(error.message || 'Purchase failed');
        } finally {
            setBuying(null);
        }
    };

    // Sort listings
    const sortedListings = [...listings].sort((a, b) => {
        if (sortBy === 'price') {
            return a.price - b.price;
        }
        return b.listedAt - a.listedAt;
    });

    // Get unique rounds for filter
    const uniqueRounds = [...new Set(listings.map(l => l.roundNumber))].sort((a, b) => b - a);


    console.log("listings", listings);
    console.log("Stats", stats)

    return (
        <div className="min-h-screen font-mono">
            {/* Header */}
            <div className="container mx-auto px-4 lg:px-8 pt-12">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Marketplace</h1>
                        <p className="text-gray-600 mt-2">Buy and sell lottery balls from other players</p>
                    </div>

                </div>
                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <Card className="bg-[#E5DFDF24] border-gray-300">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Active Listings</p>
                                        <p className="text-2xl font-bold text-gray-800">{stats.activeListings ? stats.activeListings : 0}</p>
                                    </div>
                                    <Tag className="w-8 h-8 text-purple-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#E5DFDF24] border-gray-300">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Total Sales</p>
                                        <p className="text-2xl font-bold text-green-600">{stats.totalSales ? stats.totalSales : 0}</p>
                                    </div>
                                    <ShoppingCart className="w-8 h-8 text-green-600" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#E5DFDF24] border-gray-300">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Total Volume</p>
                                        <p className="text-2xl font-bold text-orange-500">
                                            {stats.totalVolume ? (stats.totalVolume / 1e9).toFixed(2) : 0} SOL
                                        </p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-orange-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#E5DFDF24] border-gray-300">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-gray-600 text-sm">Avg Price</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {stats.avgPrice ? (stats.avgPrice / 1e9).toFixed(4) : 0} SOL
                                        </p>
                                    </div>
                                    <DollarSign className="w-8 h-8 text-blue-600" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-600 text-sm">Sort:</span>
                        <Button
                            variant={sortBy === 'price' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortBy('price')}
                            className={sortBy === 'price' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                        >
                            Lowest Price
                        </Button>
                        <Button
                            variant={sortBy === 'date' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSortBy('date')}
                            className={sortBy === 'date' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                        >
                            Newest
                        </Button>
                    </div>

                    {uniqueRounds.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 text-sm">Round:</span>
                            <Button
                                variant={filterRound === null ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilterRound(null)}
                                className={filterRound === null ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                            >
                                All
                            </Button>
                            {uniqueRounds.slice(0, 5).map((round) => (
                                <Button
                                    key={round}
                                    variant={filterRound === round ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFilterRound(round)}
                                    className={filterRound === round ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}
                                >
                                    #{round}
                                </Button>
                            ))}
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            fetchListings();
                            fetchStats();
                        }}
                        className="text-gray-600 hover:text-gray-800 ml-auto"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Listings Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
                    </div>
                ) : sortedListings.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {sortedListings.map((listing) => {
                            const isOwnListing = publicKey?.toString() === listing.sellerWallet;
                            const priceInSol = listing.price / 1e9;
                            const canAfford = unifiedBalance >= priceInSol;

                            return (
                                <Card
                                    key={listing.id}
                                    className={`bg-[#E5DFDF24] border-gray-300 overflow-hidden transition-all hover:bg-gray-50 ${isOwnListing ? 'border-orange-300' : ''
                                        }`}
                                >
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-gray-800 text-lg">
                                                Ball #{listing.ballId}
                                            </CardTitle>
                                            <Badge
                                                variant="outline"
                                                className="border-purple-500/50 text-purple-600"
                                            >
                                                Round #{listing.roundNumber}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600 text-sm">Price</span>
                                                <span className="text-xl font-bold text-gray-800">
                                                    {priceInSol.toFixed(4)} SOL
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Seller</span>
                                                <span className="text-gray-700 font-mono">
                                                    {listing.sellerWallet.slice(0, 4)}...{listing.sellerWallet.slice(-4)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Listed</span>
                                                <span className="text-gray-700">
                                                    {new Date(listing.listedAt).toLocaleDateString()}
                                                </span>
                                            </div>

                                            {isOwnListing ? (
                                                <Button
                                                    variant="outline"
                                                    className="w-full border-orange-300 text-orange-600"
                                                    disabled
                                                >
                                                    Your Listing
                                                </Button>
                                            ) : (
                                                <Button
                                                    className={`w-full ${canAfford
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        }`}
                                                    onClick={() => handleBuy(listing)}
                                                    disabled={!publicKey || buying === listing.id || !canAfford}
                                                >
                                                    {buying === listing.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                                    )}
                                                    {!publicKey
                                                        ? 'Connect Wallet'
                                                        : !canAfford
                                                            ? 'Insufficient Balance'
                                                            : 'Buy Now'}
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <Card className="bg-[#E5DFDF24] border-gray-300">
                        <CardContent className="pt-6 text-center">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                            <p className="text-gray-600">
                                No listings available. Be the first to{' '}
                                <Link href="/pachinko" className="text-blue-600 hover:underline">
                                    list your balls
                                </Link>
                                !
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Info Card */}
                <Card className="bg-[#E5DFDF24] border-gray-300 mt-8">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <DollarSign className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-gray-800 font-medium mb-1">Marketplace Fees</h3>
                                <p className="text-gray-600 text-sm">
                                    All sales have a 10% marketplace fee that goes to the treasury.
                                    Sellers receive 90% of the sale price. All transactions are
                                    processed through the Unified Wallet for instant settlement.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
};

export default Marketplace;
