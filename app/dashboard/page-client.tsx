'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedWallet } from '@/hooks/use-unified-wallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';
import {
  User,
  Wallet,
  TrendingUp,
  TrendingDown,
  Trophy,
  History,
  Clock,
  Coins,
  RefreshCw,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface UserStats {
  totalGames: number;
  totalWinnings: number;
  totalLosses: number;
  winRate: number;
  biggestWin: number;
  biggestLoss: number;
}

interface RecentActivity {
  id: string;
  type: 'win' | 'loss' | 'bet';
  amount: number;
  game: 'ore' | 'lottery';
  timestamp: number;
  roundId?: number;
  tile?: number;
}

export default function Dashboard() {
  const { isAuthenticated, wallet } = useAuth();
  const { balance: unifiedBalance, tokenBalance, fetchBalance } = useUnifiedWallet();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showBlockpadHistory, setShowBlockpadHistory] = useState(false);
  const [showPachinkoHistory, setShowPachinkoHistory] = useState(false);
  const [blockpadHistory, setBlockpadHistory] = useState<any[]>([]);
  const [pachinkoHistory, setPachinkoHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && wallet) {
      fetchUserData();
    }
  }, [isAuthenticated, wallet]);

  useEffect(() => {
    if (showBlockpadHistory && wallet) {
      fetchGameHistory('ore');
    }
  }, [showBlockpadHistory, wallet]);

  useEffect(() => {
    if (showPachinkoHistory && wallet) {
      fetchGameHistory('lottery');
    }
  }, [showPachinkoHistory, wallet]);

  const fetchUserData = async () => {
    if (!wallet) return;

    setLoading(true);
    try {
      // Fetch user stats and recent activity
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3920';

      // Get game history for stats
      const [oreHistory, lotteryHistory] = await Promise.all([
        fetch(`${baseUrl}/history/${wallet}`).catch(() => null),
        fetch(`${baseUrl}/lottery/player/${wallet}`).catch(() => null)
      ]);

      const stats: UserStats = {
        totalGames: 0,
        totalWinnings: 0,
        totalLosses: 0,
        winRate: 0,
        biggestWin: 0,
        biggestLoss: 0
      };

      const activities: RecentActivity[] = [];

      // Process ORE history
      if (oreHistory?.ok) {
        const oreData = await oreHistory.json();
        oreData.rounds?.forEach((round: any) => {
          const userBets = round.playerBets?.filter((bet: any) => bet.walletAddress === wallet) || [];
          userBets.forEach((bet: any) => {
            stats.totalGames++;
            if (bet.won) {
              stats.totalWinnings += bet.winnings || 0;
              stats.biggestWin = Math.max(stats.biggestWin, bet.winnings || 0);
              activities.push({
                id: `${round.roundId}-${bet.tileIndex}`,
                type: 'win',
                amount: bet.winnings || 0,
                game: 'ore',
                timestamp: round.timestamp,
                roundId: round.roundId,
                tile: bet.tileIndex
              });
            } else {
              stats.totalLosses += bet.amount;
              stats.biggestLoss = Math.max(stats.biggestLoss, bet.amount);
              activities.push({
                id: `${round.roundId}-${bet.tileIndex}`,
                type: 'loss',
                amount: bet.amount,
                game: 'ore',
                timestamp: round.timestamp,
                roundId: round.roundId,
                tile: bet.tileIndex
              });
            }
          });
        });
      }

      // Process Lottery history
      if (lotteryHistory?.ok) {
        const lotteryData = await lotteryHistory.json();
        lotteryData.roundHistory?.forEach((round: any) => {
          const userBets = round.playerBets?.filter((bet: any) => bet.walletAddress === wallet) || [];
          userBets.forEach((bet: any) => {
            stats.totalGames++;
            if (bet.won) {
              stats.totalWinnings += bet.winnings || 0;
              stats.biggestWin = Math.max(stats.biggestWin, bet.winnings || 0);
              activities.push({
                id: `${round.roundId}-${bet.tileIndex}`,
                type: 'win',
                amount: bet.winnings || 0,
                game: 'lottery',
                timestamp: round.timestamp,
                roundId: round.roundId,
                tile: bet.tileIndex
              });
            } else {
              stats.totalLosses += bet.amount;
              stats.biggestLoss = Math.max(stats.biggestLoss, bet.amount);
              activities.push({
                id: `${round.roundId}-${bet.tileIndex}`,
                type: 'loss',
                amount: bet.amount,
                game: 'lottery',
                timestamp: round.timestamp,
                roundId: round.roundId,
                tile: bet.tileIndex
              });
            }
          });
        });
      }

      stats.winRate = stats.totalGames > 0 ? (stats.totalWinnings / (stats.totalWinnings + stats.totalLosses)) * 100 : 0;

      // Sort activities by timestamp (most recent first)
      activities.sort((a, b) => b.timestamp - a.timestamp);

      setUserStats(stats);
      setRecentActivity(activities.slice(0, 10)); // Show last 10 activities
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyWalletAddress = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const fetchGameHistory = async (game: 'ore' | 'lottery') => {
    if (!wallet) return;

    setHistoryLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3920';
      const endpoint = game === 'ore'
        ? `${baseUrl}/history/${wallet}`
        : `${baseUrl}/lottery/player/${wallet}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch history');

      const data = await response.json();

      if (game === 'ore') {
        setBlockpadHistory(data.rounds || []);
      } else {
        setPachinkoHistory(data.roundHistory || data.rounds || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return (amount / 1e9).toFixed(4);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <User className="w-6 h-6" />
              Dashboard Access Required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Please connect your wallet to access your dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
                <User className="w-10 h-10 text-orange-500" />
                Dashboard
              </h1>
              <p className="text-gray-600 mt-2">View your profile, stats, and trading activity</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">Balance:</span>
                  <span className="font-bold text-gray-800">{unifiedBalance.toFixed(4)} SOL</span>
                </div>
              </div>
              <Button onClick={fetchUserData} variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </motion.div>

        {/* User Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <User className="w-5 h-5 text-orange-500" />
                User Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-gray-500">Wallet Address</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-3 py-1 rounded text-sm">{formatAddress(wallet!)}</code>
                    <Button variant="ghost" size="sm" onClick={copyWalletAddress}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Game Balance</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    <span className="text-lg font-semibold text-gray-800">{unifiedBalance.toFixed(4)} SOL</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Token Balance</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Trophy className="w-4 h-4 text-purple-600" />
                    <span className="text-lg font-semibold text-gray-800">{tokenBalance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Total Games</p>
                  <p className="text-3xl font-bold text-gray-800">{userStats?.totalGames || 0}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <History className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Total Winnings</p>
                  <p className="text-3xl font-bold text-green-600">{formatAmount(userStats?.totalWinnings || 0)} SOL</p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Total Losses</p>
                  <p className="text-3xl font-bold text-red-600">{formatAmount(userStats?.totalLosses || 0)} SOL</p>
                </div>
                <div className="p-3 bg-red-100 rounded-xl">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide">Win Rate</p>
                  <p className="text-3xl font-bold text-purple-600">{userStats?.winRate.toFixed(1) || 0}%</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Trophy className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-800">
                <Clock className="w-5 h-5 text-orange-500" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-gray-500">Loading activity...</span>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent activity found
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.type === 'win' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                            {activity.type === 'win' ? (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium capitalize text-gray-800">{activity.type}</p>
                            <p className="text-sm text-gray-500">
                              {activity.game === 'ore' ? 'Blockpad' : 'Pachinko'} • Round #{activity.roundId}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${activity.type === 'win' ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {activity.type === 'win' ? '+' : '-'}{formatAmount(activity.amount)} SOL
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-gray-800">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-3">
              <Link href="/blockpad" className="w-full">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Play Blockpad
                </Button>
              </Link>
              <Link href="/pachinko" className="w-full">
                <Button className="w-full border-gray-300 text-gray-700 hover:bg-gray-50" variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Play Pachinko
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-gray-800">Game History</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col space-y-3">
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowBlockpadHistory(true)}
              >
                <History className="w-4 h-4" />
                Blockpad History
              </Button>
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => setShowPachinkoHistory(true)}
              >
                <History className="w-4 h-4" />
                Pachinko History
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Game History Dialogs */}
        <Dialog open={showBlockpadHistory} onOpenChange={setShowBlockpadHistory}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Blockpad History
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-gray-500">Loading history...</span>
                </div>
              ) : blockpadHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No Blockpad history found
                </div>
              ) : (
                <div className="space-y-3">
                  {blockpadHistory.map((round: any) => {
                    const userBets = round.playerBets?.filter((bet: any) => bet.walletAddress === wallet) || [];
                    const userWon = userBets.some((bet: any) => bet.won);
                    const userWinnings = userBets.reduce((sum: number, bet: any) => sum + (bet.winnings || 0), 0);
                    const userTotalBet = userBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);

                    return (
                      <div key={round.roundId} className={`p-4 rounded-lg border ${userWon ? 'bg-green-50 border-green-200' :
                          userBets.length > 0 ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Round #{round.roundId}</p>
                            <p className="text-xs text-gray-500">{formatDate(round.timestamp)}</p>
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
                            <p className="text-xs text-gray-500">Winning Tile: #{(round.winningTile ?? 0) + 1}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={showPachinkoHistory} onOpenChange={setShowPachinkoHistory}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Pachinko History
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                  <span className="ml-2 text-gray-500">Loading history...</span>
                </div>
              ) : pachinkoHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No Pachinko history found
                </div>
              ) : (
                <div className="space-y-3">
                  {pachinkoHistory.map((round: any) => {
                    const userBets = round.playerBets?.filter((bet: any) => bet.walletAddress === wallet) || [];
                    const userWon = userBets.some((bet: any) => bet.won);
                    const userWinnings = userBets.reduce((sum: number, bet: any) => sum + (bet.winnings || 0), 0);
                    const userTotalBet = userBets.reduce((sum: number, bet: any) => sum + bet.amount, 0);

                    return (
                      <div key={round.roundId} className={`p-4 rounded-lg border ${userWon ? 'bg-green-50 border-green-200' :
                          userBets.length > 0 ? 'bg-red-50 border-red-200' :
                            'bg-gray-50 border-gray-200'
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Round #{round.roundId}</p>
                            <p className="text-xs text-gray-500">{formatDate(round.timestamp)}</p>
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
                            <p className="text-xs text-gray-500">Winning Ball: #{(round.winningTile ?? 0) + 1}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
