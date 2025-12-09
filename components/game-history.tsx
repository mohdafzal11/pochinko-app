'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Trophy, TrendingDown, Clock, Coins, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoundHistoryItem {
  roundId: number;
  winningTile: number;
  totalVolume: number;
  prizePool: number;
  playerCount: number;
  timestamp: number;
  motherlodeHit: boolean;
  playerBets?: {
    walletAddress: string;
    tileIndex: number;
    amount: number;
    won: boolean;
    winnings?: number;
  }[];
}

interface GameHistoryProps {
  walletAddress: string | null;
  game: 'ore' | 'lottery';
  apiBaseUrl?: string;
}

export default function GameHistory({ walletAddress, game, apiBaseUrl = '' }: GameHistoryProps) {
  const [history, setHistory] = useState<RoundHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundHistoryItem | null>(null);

  const fetchHistory = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = apiBaseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3920';
      const endpoint = game === 'ore' 
        ? `${baseUrl}/history/${walletAddress}` 
        : `${baseUrl}/lottery/player/${walletAddress}`;
      
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch history');
      
      const data = await response.json();
      
      // Normalize the data based on game type
      if (game === 'ore') {
        setHistory(data.rounds || []);
      } else {
        // Lottery history format may differ
        setHistory(data.roundHistory || data.rounds || []);
      }
    } catch (err: any) {
      console.error('Error fetching history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress && showModal) {
      fetchHistory();
    }
  }, [walletAddress, showModal]);

  const getUserBetsForRound = (round: RoundHistoryItem) => {
    if (!walletAddress || !round.playerBets) return [];
    return round.playerBets.filter(b => b.walletAddress === walletAddress);
  };

  const formatAmount = (lamports: number) => {
    // Convert from lamports to SOL
    return (lamports / 1e9).toFixed(4);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      {/* History Button */}
      <Button
        onClick={() => setShowModal(true)}
        variant="outline"
        className="flex items-center gap-2"
      >
        <History className="w-4 h-4" />
        History
      </Button>

      {/* History Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/50" 
              onClick={() => setShowModal(false)} 
            />
            
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-5 h-5" />
                  {game === 'ore' ? 'ORE Game' : 'Lottery'} History
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={fetchHistory}
                    variant="ghost"
                    size="sm"
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {!walletAddress ? (
                  <div className="text-center py-8 text-gray-500">
                    Connect your wallet to view history
                  </div>
                ) : loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
                    <p className="mt-2 text-gray-500">Loading history...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-500">
                    {error}
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No game history yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((round) => {
                      const userBets = getUserBetsForRound(round);
                      const userWon = userBets.some(b => b.won);
                      const userWinnings = userBets.reduce((sum, b) => sum + (b.winnings || 0), 0);
                      const userTotalBet = userBets.reduce((sum, b) => sum + b.amount, 0);

                      return (
                        <motion.div
                          key={round.roundId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-lg border ${
                            userWon 
                              ? 'bg-green-50 border-green-200' 
                              : userBets.length > 0 
                                ? 'bg-red-50 border-red-200' 
                                : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {userWon ? (
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Trophy className="w-5 h-5 text-green-600" />
                                </div>
                              ) : userBets.length > 0 ? (
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                  <TrendingDown className="w-5 h-5 text-red-600" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  <Clock className="w-5 h-5 text-gray-600" />
                                </div>
                              )}
                              
                              <div>
                                <p className="font-semibold">
                                  Round #{round.roundId}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(round.timestamp)}
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              {userWon && (
                                <p className="text-lg font-bold text-green-600">
                                  +{formatAmount(userWinnings)} SOL
                                </p>
                              )}
                              {userBets.length > 0 && !userWon && (
                                <p className="text-lg font-bold text-red-600">
                                  -{formatAmount(userTotalBet)} SOL
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Winning Tile: #{round.winningTile}
                              </p>
                            </div>
                          </div>

                          {/* Expandable Details */}
                          {userBets.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-600 mb-2">Your Bets:</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {userBets.map((bet, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`flex items-center justify-between p-2 rounded ${
                                      bet.won ? 'bg-green-100' : 'bg-gray-100'
                                    }`}
                                  >
                                    <span>Tile #{bet.tileIndex}</span>
                                    <span className="font-medium">
                                      {formatAmount(bet.amount)} SOL
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Coins className="w-3 h-3" />
                              Pool: {formatAmount(round.prizePool)} SOL
                            </span>
                            <span>
                              Players: {round.playerCount}
                            </span>
                            {round.motherlodeHit && (
                              <span className="text-yellow-600 font-semibold">
                                🎰 MOTHERLODE!
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
