'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-web-socket';
import { useSolanaWallet } from '@/hooks/use-solana-wallet';
import { useUnifiedWallet } from '@/hooks/use-unified-wallet';
import { Round, Tile, HistoryRound } from '@/types/game';
import { toast } from 'sonner';
import GameGrid from '@/components/game-grid';
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Music, HelpCircle, Package, Store, Sparkles } from "lucide-react";
import FloatingIcon from '@/components/floating-icon';
import { Button } from '@/components/ui/button';

export default function Blockpad() {

  const { isConnected: wsConnected, emit, on, off } = useWebSocket();
  const { isConnected: walletConnected, balance, publicKey } = useSolanaWallet();

  // Use unified wallet for game balance
  const {
    balance: unifiedBalance,
    account: unifiedAccount,
    accountExists,
    configExists,
    loading: unifiedLoading,
    deposit: unifiedDeposit,
    withdraw: unifiedWithdraw,
    fetchBalance: refreshUnifiedBalance,
  } = useUnifiedWallet();


  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const [lastBetTiles, setLastBetTiles] = useState<number[]>([]);
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [showHistory, setShowHistory] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [history, setHistory] = useState<HistoryRound[]>([]);

  const [activities, setActivities] = useState<any[]>([
    { id: 1, type: "win", amount: 2580 },
    { id: 2, type: "buy", user: "@grinding_negro", text: "bought 69 balls ..." },
    { id: 3, type: "sell", user: "@tetsuodoteth", text: "sold 2 balls" },
  ]);


  const gameBalance = unifiedBalance;

  // Initialize tiles
  const defaultTiles: Tile[] = Array.from({ length: 25 }, (_, i) => ({
    id: i,
    position: i + 1,
    bets: 0,
    volume: 0,
  }));




  useEffect(() => {
    if (!wsConnected) return;

    // Listen for round events
    const handleRoundStarted = (data: any) => {
      console.log('📨 Round data received:', data);
      console.log('  - tiles:', data.tiles?.length, 'tiles');
      console.log('  - roundId:', data.roundId);
      console.log('  - motherlodePool:', data.motherlodePool);
      console.log('  - prizePool:', data.prizePool);
      console.log('  - status:', data.status);

      // Ensure all fields are properly set
      setCurrentRound({
        ...data,
        id: data.id || data.roundId?.toString(),
        roundId: data.roundId,
        motherlodePool: data.motherlodePool || 0,
        prizePool: data.prizePool || 0,
        totalVolume: data.totalVolume || 0,
        playerCount: data.playerCount || 0,
      });
      setSelectedTiles([]);
      toast.success(`Round #${data.roundId || data.id} started!`);
    };

    const handleGameUpdate = (data: { tiles: Tile[]; totalVolume: number; playerCount: number }) => {
      if (currentRound) {
        setCurrentRound({
          ...currentRound,
          tiles: data.tiles,
          totalVolume: data.totalVolume,
          playerCount: data.playerCount,
        });
      }
    };

    const handleTimerStarted = (data: { endTime: number; duration: number }) => {
      if (currentRound) {
        console.log('⏰ Timer started! Updated endTime:', new Date(data.endTime).toLocaleTimeString());
        setCurrentRound({
          ...currentRound,
          endTime: data.endTime,
          duration: data.duration,
        });
        toast.info('Round timer started!');
      }
    };

    const handleRoundActivated = (data: { status: string; endTime: number; duration: number; message: string }) => {
      if (currentRound) {
        console.log('🎬 Round activated! Status:', data.status);
        setCurrentRound({
          ...currentRound,
          status: data.status as any,
          endTime: data.endTime,
          duration: data.duration,
        });
        toast.success(data.message || 'Round is now active!');
      }
    };

    const handleBetSuccess = (data: any) => {
      toast.success('Bet placed successfully!');
      setSelectedTiles([]);
      // Refresh unified wallet balance after bet
      setTimeout(() => refreshUnifiedBalance(), 2000);
    };

    const handleBetError = (data: { error: string }) => {
      toast.error(data.error || 'Failed to place bet');
    };

    const handleRoundFinalizing = (data: { roundId: number }) => {
      if (currentRound && currentRound.id === data.roundId) {
        console.log('⏳ Round finalizing, disabling bets...');
        setCurrentRound({
          ...currentRound,
          status: 'finalizing'
        });
        toast.info('Round finalizing...');
      }
    };

    const handleRoundFinalized = (data: { winner: number; prizePool: number; vrfProof: string }) => {
      if (currentRound) {
        const finalizedRound: HistoryRound = {
          ...currentRound,
          winner: data.winner,
          vrfProof: data.vrfProof,
          status: 'completed',
          userWon: lastBetTiles.includes(data.winner),
          userPrize: lastBetTiles.includes(data.winner) ? data.prizePool * 0.95 : 0,
        };

        setHistory((prev) => [finalizedRound, ...prev]);

        if (finalizedRound.userWon) {
          toast.success(`🎉 You won ${finalizedRound.userPrize.toFixed(2)} SOL!`);
          // Refresh unified wallet balance after winning
          setTimeout(() => refreshUnifiedBalance(), 2000);
        }
      }
    };

    on('round:started', handleRoundStarted);
    on('round:activated', handleRoundActivated);
    on('round:timer_started', handleTimerStarted);
    on('game:update', handleGameUpdate);
    on('bet:success', handleBetSuccess);
    on('bet:error', handleBetError);
    on('round:finalizing', handleRoundFinalizing);
    on('round:finalized', handleRoundFinalized);

    return () => {
      off('round:started', handleRoundStarted);
      off('round:activated', handleRoundActivated);
      off('round:timer_started', handleTimerStarted);
      off('game:update', handleGameUpdate);
      off('bet:success', handleBetSuccess);
      off('bet:error', handleBetError);
      off('round:finalizing', handleRoundFinalizing);
      off('round:finalized', handleRoundFinalized);
    };
  }, [wsConnected, currentRound, lastBetTiles, on, off]);



  const handlePlaceBet = (amount: number) => {
    if (!walletConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!publicKey) {
      toast.error('Wallet not found');
      return;
    }

    // Allow betting in 'waiting' and 'active' status
    if (!currentRound || (currentRound.status !== 'active' && currentRound.status !== 'waiting')) {
      toast.error('Round is not available. Please wait for the next round.');
      return;
    }

    if (selectedTiles.length === 0) {
      toast.error('Please select at least one tile');
      return;
    }

    if (amount <= 0 || Number.isNaN(amount)) {
      toast.error('Enter a valid bet amount first');
      return;
    }

    const totalCost = amount * selectedTiles.length;
    if (totalCost > gameBalance) {
      toast.error(`Insufficient game balance. Need ${totalCost.toFixed(2)} SOL but only have ${gameBalance.toFixed(2)} SOL`);
      return;
    }

    const tilesToBet = [...selectedTiles];
    setLastBetTiles(tilesToBet);

    tilesToBet.forEach((tileIndex) => {
      emit('bet:place', {
        tileIndex,
        amount,
        walletAddress: publicKey.toString(),
      });
    });
  };

  const handleBetAmountChange = (value: string) => {
    setBetAmount(value);

    const amount = parseFloat(value);
    if (Number.isNaN(amount) || amount <= 0) {
      return;
    }

    const maxTiles = Math.floor(gameBalance / amount);

    if (maxTiles <= 0 && selectedTiles.length > 0) {
      setSelectedTiles([]);
      toast.error('Bet amount exceeds your game balance. Selection cleared.');
      return;
    }

    if (maxTiles > 0 && selectedTiles.length > maxTiles) {
      setSelectedTiles((prev) => prev.slice(0, maxTiles));
      toast.warning(`Selection trimmed to ${maxTiles} tile${maxTiles > 1 ? 's' : ''} to fit your balance.`);
    }
  };

  const handleTileSelection = (tileId: number) => {
    const amount = parseFloat(betAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid bet amount before selecting tiles.');
      return;
    }

    const isSelected = selectedTiles.includes(tileId);
    if (isSelected) {
      setSelectedTiles(selectedTiles.filter((id) => id !== tileId));
      return;
    }

    const maxTiles = Math.floor(gameBalance / amount);
    if (maxTiles <= 0) {
      toast.error('Insufficient balance for this bet amount.');
      return;
    }

    if (selectedTiles.length >= maxTiles) {
      toast.error(`Balance only covers ${maxTiles} tile${maxTiles > 1 ? 's' : ''} at ${amount.toFixed(2)} SOL.`);
      return;
    }

    setSelectedTiles([...selectedTiles, tileId]);
  };

  const handleDeposit = async (amount: number) => {
    if (!walletConnected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (amount > balance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    const success = await unifiedDeposit(amount);
    if (success) {
      toast.success(`✅ Deposited ${amount} SOL to unified wallet!`);
    }
  };

  const handleWithdraw = async (amount: number) => {
    if (!walletConnected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (amount <= 0 || amount > gameBalance) {
      toast.error('Invalid withdrawal amount');
      return;
    }

    const success = await unifiedWithdraw(amount);
    if (success) {
      toast.success(`✅ Withdrawn ${amount} SOL from unified wallet!`);
    }
  };


  const leftIcons = [
    { Icon: Gamepad2, color: "bg-[#FFD374]", label: "CONSOLE", offset: false },
    { Icon: Music, color: "bg-[#DD5622]", label: "MUSIC", offset: true },
    { Icon: HelpCircle, color: "bg-[#749CFF]", label: "HOW TO PLAY?", offset: false },
  ];

  const rightIcons = [
    { Icon: Package, color: "bg-[#FF7492]", label: "INVENTORY", offset: false },
    { Icon: Store, color: "bg-[#F48C8C]", label: "MARKETPLACE", offset: true },
    { Icon: Gamepad2, color: "bg-[#DAE998]", label: "MACHINES", offset: false },
  ];



  const generateActivity = () => {
    const types = [
      { type: "win", text: "won $", amount: Math.floor(Math.random() * 5000) + 500 },
      { type: "buy", user: `@user${Math.floor(Math.random() * 9999)}`, text: "bought 69 balls ..." },
      { type: "sell", user: `@degen${Math.floor(Math.random() * 9999)}`, text: "sold 2 balls" },
      { type: "buy", user: `@whale_${Math.random().toString(36).substr(2, 5)}`, text: "bought 420 balls ..." },
    ];
    return types[Math.floor(Math.random() * types.length)];
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newAct = { ...generateActivity(), id: Date.now() + Math.random() };

      setActivities((prev) => {
        const updated = [newAct, ...prev];
        return updated.slice(0, 3);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen font-mono">
      <main className="w-full mx-auto px-4 lg:px-8 pt-12 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr] gap-4 items-start">

        {/* ==================== LEFT SIDEBAR ==================== */}
        <div className="hidden lg:block space-y-16">

          {/* Live Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="bg-[#E5DFDF24] p-2 border-gray-300 border-1 overflow-hidden rounded-md"
          >
            <div className="relative h-[200px]">
              <AnimatePresence mode="popLayout">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    layout
                    initial={{ opacity: 0, y: 60, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -60, scale: 0.9 }}
                    transition={{
                      layout: { duration: 0.4 },
                      y: { type: "spring", stiffness: 400, damping: 30 },
                    }}
                    className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 border-1 rounded-full bg-white`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {activity.type === "win" ? (
                        <p className="font-bold text-green-600 text-lg truncate">
                          won ${activity.amount.toLocaleString()}
                        </p>
                      ) : (
                        <>
                          <p className="font-bold text-muted-foreground truncate">{activity.user}</p>
                          <p className="text-sm text-muted-foreground truncate">{activity.text}</p>
                        </>
                      )}
                    </div>

                    {activity.type === "win" && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="text-yellow-500 text-2xl"
                      >

                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Floating Icons - LEFT */}
          <div className="flex flex-col items-end gap-12 mt-12">
            {leftIcons.map((icon, i) => (
              <FloatingIcon key={icon.label} {...icon} index={i} />
            ))}
          </div>
        </div>

        {/* ==================== CENTER GRID ==================== */}
        <div className="relative flex justify-center">
          <GameGrid
            round={currentRound}
            tiles={(currentRound?.tiles && currentRound.tiles.length > 0) ? currentRound.tiles : defaultTiles}
            selectedTiles={selectedTiles}
            onTileToggle={handleTileSelection}
            disabled={!walletConnected || !wsConnected || currentRound?.status === 'finalizing' || currentRound?.status === 'finalized'}
            onPlaceBet={handlePlaceBet}
            walletAddress={publicKey?.toString() || null}
          />

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-white rounded-full absolute -bottom-10 z-[999999]  w-full sm:w-auto">
            <Button
              onClick={() => handlePlaceBet(parseFloat(betAmount))}
              disabled={!walletConnected || !wsConnected || currentRound?.status === 'finalizing' || currentRound?.status === 'finalized'}
              className="w-full bg-white text-lg text-black px-20 py-7 rounded-full disabled:cursor-not-allowed"
            >
              LET’S PLAY
            </Button>
          </motion.div>
        </div>

        {/* ==================== RIGHT SIDEBAR ==================== */}
        <div className="hidden lg:block space-y-16">

          {/* Animated Text Block */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-right"
          >
            <div className="h-[200px] w-full flex items-center justify-start">
              <div className="max-w-sm ml-auto space-y-4">
                <motion.p className="text-sm lg:text-base space-y-2 text-gray-700 font-medium leading-relaxed">
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                    className="block text-muted-foreground text-sm uppercase">
                    Let your balls drop! watch them bounce and hit massive jackpots!
                  </motion.span>


                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8, duration: 1.2 }}
                    className="block text-muted-foreground text-sm uppercase"
                  >
                    The most thrilling onchain pachinko experience.
                  </motion.span>


                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8, duration: 1.2 }}
                    className="block mt-6 text-sm uppercase text-muted-foreground"
                  >
                    Let’s play Pachinko
                  </motion.span>
                </motion.p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col items-start gap-12">
            {rightIcons.map((icon, i) => (
              <FloatingIcon key={icon.label} {...icon} index={i} isRightSide />
            ))}
          </div>
        </div>
      </main>

      {/* Prize Pool & Background */}
      <div className="w-full mt-20 py-10 bg-gray-300/50 backdrop-blur">
        <div className="mx-auto px-8 flex flex-wrap items-center justify-center gap-10 sm:gap-20 text-center">
          <p className="text-gray-700 font-bold text-lg">TODAY'S PRIZE POOL</p>
          <div className="flex flex-wrap gap-10 text-4xl sm:text-5xl font-black text-orange-600">
            <span>+ $20,000</span>
            <span>+ $20,000</span>
            <span className="text-orange-500">+ $20,000</span>
          </div>
        </div>
      </div>

      <div className="px-8">
        <Image src="/loop-background.png" alt="Pachinko Background" className="object-cover" height={16} width={400} />
      </div>
    </div>
  );
}
