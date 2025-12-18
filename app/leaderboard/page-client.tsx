"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Crown, Medal, Award } from "lucide-react";

type LeaderboardType = "volume" | "winning" | "loss";
type GameFilter = "all" | "blockpad" | "lottery";

interface LeaderboardEntry {
  rank: number;
  username: string;
  walletAddress: string;
  amount: number;
  games: number;
}

// Mock data - replace with actual API data
const generateMockData = (type: LeaderboardType, game: GameFilter): LeaderboardEntry[] => {
  const baseData = [
    { username: "CryptoKing", walletAddress: "7xK...9mP", amount: 125000, games: 450 },
    { username: "LuckyWhale", walletAddress: "5nQ...3rT", amount: 98500, games: 380 },
    { username: "BlockMaster", walletAddress: "9pL...7wX", amount: 87300, games: 320 },
    { username: "DiamondHands", walletAddress: "2vM...5kN", amount: 76200, games: 290 },
    { username: "MoonShot", walletAddress: "8hR...4jB", amount: 65100, games: 250 },
    { username: "GachaGod", walletAddress: "3tY...8pQ", amount: 54800, games: 220 },
    { username: "PachinkoProf", walletAddress: "6wZ...2nL", amount: 48900, games: 195 },
    { username: "BetBeast", walletAddress: "4kM...9vC", amount: 42300, games: 175 },
    { username: "RollMaster", walletAddress: "1xP...6hD", amount: 38700, games: 160 },
    { username: "SpinLegend", walletAddress: "5jT...3mF", amount: 35200, games: 145 },
  ];

  return baseData.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
};

export default function Leaderboard() {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("volume");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");

  const data = generateMockData(leaderboardType, gameFilter);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-xl font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getTypeIcon = (type: LeaderboardType) => {
    switch (type) {
      case "volume":
        return <TrendingUp className="w-5 h-5" />;
      case "winning":
        return <Trophy className="w-5 h-5" />;
      case "loss":
        return <TrendingDown className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: LeaderboardType) => {
    switch (type) {
      case "volume":
        return "text-blue-500";
      case "winning":
        return "text-green-500";
      case "loss":
        return "text-red-500";
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 flex items-center justify-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-500" />
              Leaderboard
            </h1>
            <p className="text-gray-600 text-lg">
              Compete with the best players and climb to the top!
            </p>
          </div>
        </motion.div>

        {/* Leaderboard Type Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Tabs
            value={leaderboardType}
            onValueChange={(value) => setLeaderboardType(value as LeaderboardType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
              <TabsTrigger
                value="volume"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">Volume Based</span>
                <span className="sm:hidden">Volume</span>
              </TabsTrigger>
              <TabsTrigger
                value="winning"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-green-500 data-[state=active]:text-white"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Winning Based</span>
                <span className="sm:hidden">Wins</span>
              </TabsTrigger>
              <TabsTrigger
                value="loss"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-red-500 data-[state=active]:text-white"
              >
                <TrendingDown className="w-4 h-4" />
                <span className="hidden sm:inline">Loss Based</span>
                <span className="sm:hidden">Loss</span>
              </TabsTrigger>
            </TabsList>

            {/* Game Filter Buttons */}
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
              <Badge
                variant={gameFilter === "all" ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm  transition-all"
                onClick={() => setGameFilter("all")}
              >
                All Games
              </Badge>
              <Badge
                variant={gameFilter === "blockpad" ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm transition-all"
                onClick={() => setGameFilter("blockpad")}
              >
                Blockpad
              </Badge>
              <Badge
                variant={gameFilter === "lottery" ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 text-sm transition-all"
                onClick={() => setGameFilter("lottery")}
              >
                Lottery
              </Badge>
            </div>

            {/* Volume Based Leaderboard */}
            <TabsContent value="volume" className="space-y-4 mt-6">
              <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-500">
                    <TrendingUp className="w-6 h-6" />
                    Volume Leaders
                    <span className="text-sm text-gray-500 ml-2">
                      ({gameFilter === "all" ? "All Games" : gameFilter === "blockpad" ? "Blockpad" : "Lottery"})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.map((entry) => (
                      <motion.div
                        key={entry.rank}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: entry.rank * 0.05 }}
                        className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-[1.02] ${
                          entry.rank <= 3
                            ? "bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/20"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex-shrink-0 w-12 flex justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg truncate text-gray-800">{entry.username}</div>
                          <div className="text-sm text-gray-500 font-mono">{entry.walletAddress}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xl text-blue-500">{formatAmount(entry.amount)}</div>
                          <div className="text-sm text-gray-500">{entry.games} games</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Winning Based Leaderboard */}
            <TabsContent value="winning" className="space-y-4 mt-6">
              <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <Trophy className="w-6 h-6" />
                    Top Winners
                    <span className="text-sm text-gray-500 ml-2">
                      ({gameFilter === "all" ? "All Games" : gameFilter === "blockpad" ? "Blockpad" : "Lottery"})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.map((entry) => (
                      <motion.div
                        key={entry.rank}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: entry.rank * 0.05 }}
                        className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-[1.02] ${
                          entry.rank <= 3
                            ? "bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex-shrink-0 w-12 flex justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg truncate text-gray-800">{entry.username}</div>
                          <div className="text-sm text-gray-500 font-mono">{entry.walletAddress}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xl text-green-500">{formatAmount(entry.amount)}</div>
                          <div className="text-sm text-gray-500">{entry.games} wins</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Loss Based Leaderboard */}
            <TabsContent value="loss" className="space-y-4 mt-6">
              <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <TrendingDown className="w-6 h-6" />
                    Biggest Losses
                    <span className="text-sm text-gray-500 ml-2">
                      ({gameFilter === "all" ? "All Games" : gameFilter === "blockpad" ? "Blockpad" : "Lottery"})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.map((entry) => (
                      <motion.div
                        key={entry.rank}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: entry.rank * 0.05 }}
                        className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-[1.02] ${
                          entry.rank <= 3
                            ? "bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex-shrink-0 w-12 flex justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-lg truncate text-gray-800">{entry.username}</div>
                          <div className="text-sm text-gray-500 font-mono">{entry.walletAddress}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xl text-red-500">-{formatAmount(entry.amount)}</div>
                          <div className="text-sm text-gray-500">{entry.games} losses</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-dashed bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center text-sm text-gray-600 space-y-2">
                <p>🏆 Leaderboard updates every 5 minutes</p>
                <p>💎 Play more games to climb the ranks!</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
