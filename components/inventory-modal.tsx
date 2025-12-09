'use client';

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { toast } from 'sonner';
import { Package, Tag, Loader2, ArrowLeft, ShoppingCart, X } from 'lucide-react';
import { useUnifiedWallet } from '@/hooks/use-unified-wallet';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3920';


interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    description?: string;
}

interface InventoryContent {
    title: string;
    subtitle: string;
    items: InventoryItem[];
}

interface InventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    page: string;
}

const rarityColors = {
    common: 'bg-gray-100 text-gray-800 border-gray-300',
    rare: 'bg-blue-100 text-blue-800 border-blue-300',
    epic: 'bg-purple-100 text-purple-800 border-purple-300',
    legendary: 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

const rarityGradients = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-yellow-600'
};


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

export default function InventoryModal({
    isOpen,
    onClose,
    page
}: InventoryModalProps) {


    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(false);
    const [inventory, setInventory] = useState<InventoryData[]>([]);
    const [activeListings, setActiveListings] = useState<Listing[]>([]);
    const [selectedBall, setSelectedBall] = useState<Ball | null>(null);
    const [listPrice, setListPrice] = useState<string>('');
    const [listing, setListing] = useState(false);


    const fetchInventory = useCallback(async () => {
        if (!publicKey) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/inventory/${publicKey.toString()}`);
            const data = await response.json();

            if (data.success) {
                setInventory(data.inventory || []);
                setActiveListings(data.activeListings || []);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    }, [publicKey]);


    useEffect(() => {
        fetchInventory();
    }, [fetchInventory , isOpen]);

    // List ball for sale
    const handleListBall = async (ball: Ball, roundNumber: number, machineId: string) => {
        if (!publicKey) {
            toast.error('Please connect your wallet');
            return;
        }

        const price = parseFloat(listPrice);
        if (isNaN(price) || price <= 0) {
            toast.error('Please enter a valid price');
            return;
        }

        setListing(true);
        try {
            const response = await fetch(`${API_URL}/marketplace/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sellerWallet: publicKey.toString(),
                    machineId,
                    roundNumber,
                    ballId: ball.ballId,
                    price,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success(`Ball #${ball.ballId} listed for ${price} SOL`);
                setSelectedBall(null);
                setListPrice('');
                fetchInventory();
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
    const handleCancelListing = async (listing: Listing) => {
        if (!publicKey) return;

        try {
            const response = await fetch(`${API_URL}/marketplace/delist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sellerWallet: publicKey.toString(),
                    listingId: listing.id,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Listing cancelled');
                fetchInventory();
            } else {
                toast.error(data.error || 'Failed to cancel listing');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel listing');
        }
    };

    // Get total balls count
    const totalBalls = inventory.reduce((sum, inv) => sum + inv.balls.length, 0);
    const listedBalls = activeListings.length;


    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 flex items-center justify-center z-50"
                >
                    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                    <motion.div
                        initial={{ y: 50 }}
                        animate={{ y: 0 }}
                        className="relative bg-white rounded-2xl p-8 max-w-6xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-hidden"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <main className="container mx-auto px-4 py-8">
        {!publicKey ? (
          <Card className="bg-[#E5DFDF24] border-gray-300 max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Connect Wallet</h2>
              <p className="text-gray-600 mb-4">Connect your wallet to view your lottery ball inventory</p>
              <WalletMultiButton />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-[#E5DFDF24] border-gray-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Balls</p>
                      <p className="text-2xl font-bold text-gray-800">{totalBalls}</p>
                    </div>
                    <Package className="w-8 h-8 text-gray-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#E5DFDF24] border-gray-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Listed for Sale</p>
                      <p className="text-2xl font-bold text-orange-500">{listedBalls}</p>
                    </div>
                    <Tag className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#E5DFDF24] border-gray-300">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Available</p>
                      <p className="text-2xl font-bold text-green-600">{totalBalls - listedBalls}</p>
                    </div>
                    <Package className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Listings */}
            {activeListings.length > 0 && (
              <Card className="bg-[#E5DFDF24] border-gray-300">
                <CardHeader>
                  <CardTitle className="text-gray-800 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-orange-500" />
                    Your Active Listings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="flex items-center justify-between p-3 bg-[#E5DFDF24] rounded-lg"
                      >
                        <div>
                          <p className="text-gray-800 font-medium">Ball #{listing.ballId}</p>
                          <p className="text-gray-600 text-sm">
                            Round #{listing.roundNumber} • Listed {new Date(listing.listedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="border-orange-500/50 text-orange-500">
                            {(listing.price / 1e9).toFixed(4)} SOL
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelListing(listing)}
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
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
              </div>
            ) : inventory.length > 0 ? (
              inventory.map((inv) => (
                <Card key={`${inv.machineId}-${inv.roundNumber}`} className="bg-[#E5DFDF24] border-gray-300">
                  <CardHeader>
                    <div className="space-y-2">
                      <CardTitle className="text-gray-800 flex items-center justify-between">
                        <span>Round #{inv.roundNumber}</span>
                        <Badge variant="outline" className="border-purple-500/50 text-purple-600">
                          {inv.balls.length} balls
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Machine: {inv.machineId}
                        </span>
                        <span>
                          Last updated: {new Date(inv.lastUpdated).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        Wallet: {inv.walletAddress.slice(0, 8)}...{inv.walletAddress.slice(-8)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Available</p>
                          <p className="text-lg font-semibold text-green-600">
                            {inv.balls.filter(b => !b.listedForSale).length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Listed</p>
                          <p className="text-lg font-semibold text-orange-500">
                            {inv.balls.filter(b => b.listedForSale).length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Total Value</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {inv.balls.length} balls
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {inv.balls.map((ball) => (
                        <div
                          key={ball.ballId}
                          className={`p-3 rounded-lg text-center cursor-pointer transition-all relative ${
                            ball.listedForSale
                              ? 'bg-orange-100 border border-orange-300'
                              : selectedBall?.ballId === ball.ballId
                              ? 'bg-blue-100 border border-blue-300'
                              : 'bg-white hover:bg-gray-50 border border-gray-200'
                          }`}
                          onClick={() => !ball.listedForSale && setSelectedBall(ball)}
                        >
                          <div className="absolute top-1 right-1">
                            <div className={`w-2 h-2 rounded-full ${
                              ball.listedForSale ? 'bg-orange-400' : 'bg-green-400'
                            }`} />
                          </div>
                          <p className="text-gray-800 font-mono text-sm font-medium">#{ball.ballId}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {ball.listedForSale ? 'Listed' : 'Available'}
                          </p>
                          {ball.listedForSale && (
                            <Badge className="mt-1 text-xs bg-orange-100 text-orange-600">
                              For Sale
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* List Ball Modal */}
                    {selectedBall && !selectedBall.listedForSale && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-gray-800 font-medium mb-3">
                          List Ball #{selectedBall.ballId} for Sale
                        </h4>
                        <div className="flex gap-3">
                          <Input
                            type="number"
                            placeholder="Price in SOL"
                            value={listPrice}
                            onChange={(e) => setListPrice(e.target.value)}
                            className="bg-white border-gray-300 text-gray-800"
                            step="0.001"
                            min="0.001"
                          />
                          <Button
                            onClick={() => handleListBall(selectedBall, inv.roundNumber, inv.machineId)}
                            disabled={listing || !listPrice}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            {listing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'List for Sale'
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setSelectedBall(null);
                              setListPrice('');
                            }}
                            className="text-gray-600"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-[#E5DFDF24] border-gray-300">
                <CardContent className="pt-6 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                  <p className="text-gray-600">
                    No balls in your inventory. Buy some from the{' '}
                    <Link href={`/${page}`} className="capitalize text-blue-600 hover:underline">
                      {page}
                    </Link>{' '}
                    or the{' '}
                    <Link href={`/${page}/marketplace`} className="text-blue-600 hover:underline">
                      Marketplace
                    </Link>
                    !
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
