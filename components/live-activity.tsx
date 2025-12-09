'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Coins, Ticket, TrendingUp } from 'lucide-react';
import { useWebSocket } from '@/hooks/use-web-socket';

interface ActivityItem {
  id: string;
  type: 'win' | 'bet' | 'buy' | 'sell';
  walletAddress: string;
  amount: number;
  game?: 'ore' | 'lottery';
  roundId?: number;
  tileIndex?: number;
  tileIndices?: number[]; // For batch bets
  timestamp: number;
}

interface LiveActivityProps {
  maxItems?: number;
  showGame?: 'ore' | 'lottery' | 'all';
}

export default function LiveActivity({ maxItems = 5, showGame = 'all' }: LiveActivityProps) {
  const { isConnected, on, off } = useWebSocket();
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const addActivity = useCallback((activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setActivities((prev) => {
      const updated = [newActivity, ...prev];
      return updated.slice(0, maxItems);
    });
  }, [maxItems]);

  useEffect(() => {
    if (!isConnected) return;

    // Handler for win events
    const handleWin = (data: any) => {
      if (showGame !== 'all' && data.game !== showGame) return;
      
      addActivity({
        type: 'win',
        walletAddress: data.walletAddress,
        amount: data.amount,
        game: data.game,
        roundId: data.roundId,
      });
    };

    // Handler for bet events (including batch)
    const handleBet = (data: any) => {
      if (showGame !== 'all' && data.game !== showGame) return;
      
      addActivity({
        type: 'bet',
        walletAddress: data.walletAddress,
        amount: data.amount,
        game: data.game,
        roundId: data.roundId,
        tileIndex: data.tileIndex,
        tileIndices: data.tileIndices, // For batch bets
      });
    };

    // Handler for lottery ball purchases
    const handleBallBuy = (data: any) => {
      if (showGame !== 'all' && showGame !== 'lottery') return;
      
      addActivity({
        type: 'buy',
        walletAddress: data.walletAddress,
        amount: data.balls || data.amount,
        game: 'lottery',
        roundId: data.roundNumber,
      });
    };

    on('activity:win', handleWin);
    on('activity:bet', handleBet);
    on('activity:buy', handleBallBuy);
    on('lottery:ball_purchase', handleBallBuy);

    return () => {
      off('activity:win', handleWin);
      off('activity:bet', handleBet);
      off('activity:buy', handleBallBuy);
      off('lottery:ball_purchase', handleBallBuy);
    };
  }, [isConnected, on, off, showGame, addActivity]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'win':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'bet':
        return <Coins className="w-4 h-4 text-blue-500" />;
      case 'buy':
        return <Ticket className="w-4 h-4 text-purple-500" />;
      case 'sell':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      default:
        return <Coins className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'win':
        return (
          <span className="text-green-600 font-bold">
            won {activity.amount.toFixed(4)} SOL
          </span>
        );
      case 'bet':
        // Handle batch bets (multiple tiles)
        if (activity.tileIndices && activity.tileIndices.length > 0) {
          const displayTiles = activity.tileIndices.map(t => t + 1); // Convert to 1-indexed
          if (displayTiles.length > 5) {
            return (
              <span className="text-gray-700">
                bet {activity.amount.toFixed(4)} SOL on {displayTiles.length} tiles
              </span>
            );
          }
          return (
            <span className="text-gray-700">
              bet {activity.amount.toFixed(4)} SOL on tiles #{displayTiles.join(', #')}
            </span>
          );
        }
        // Single tile bet
        return (
          <span className="text-gray-700">
            bet {activity.amount.toFixed(4)} SOL
            {activity.tileIndex !== undefined && (
              <span className="text-gray-500"> on tile #{activity.tileIndex + 1}</span>
            )}
          </span>
        );
      case 'buy':
        return (
          <span className="text-purple-600">
            bought {activity.amount} balls
          </span>
        );
      case 'sell':
        return (
          <span className="text-green-600">
            sold {activity.amount} balls
          </span>
        );
      default:
        return null;
    }
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (activities.length === 0) {
    return (
      <div className="bg-[#E5DFDF24] p-4 border border-gray-300 rounded-md">
        <p className="text-sm text-gray-500 text-center">
          Waiting for activity...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#E5DFDF24] p-2 border border-gray-300 rounded-md overflow-hidden">
      <div className="relative h-[180px]">
        <AnimatePresence mode="popLayout">
          {activities.map((activity) => (
            <motion.div
              key={activity.id}
              layout
              initial={{ opacity: 0, y: 60, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -60, scale: 0.9 }}
              transition={{
                layout: { duration: 0.4 },
                y: { type: 'spring', stiffness: 400, damping: 30 },
              }}
              className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border flex items-center justify-center">
                {getActivityIcon(activity.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">
                  {activity.walletAddress}
                </p>
                <p className="text-sm truncate">
                  {getActivityText(activity)}
                </p>
              </div>

              {/* Time */}
              <div className="flex-shrink-0 text-xs text-gray-400">
                {getTimeAgo(activity.timestamp)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
