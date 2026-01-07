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
import { Gamepad2, Music, HelpCircle, Package, Store, Sparkles, X, History } from "lucide-react";
import FloatingIcon from '@/components/floating-icon';
import { Button } from '@/components/ui/button';
import LiveActivity from '@/components/live-activity';
import GameHistory from '@/components/game-history';
import RoundResultModal from '@/components/round-result-modal';

export default function Blockpad() {

  const { isConnected: wsConnected, emit, on, off } = useWebSocket();
  const { isConnected: walletConnected, balance, publicKey, updateBalance } = useSolanaWallet();

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
  const [alreadyBetTiles, setAlreadyBetTiles] = useState<number[]>([]); // Tiles user already bet on this round
  const [betAmount, setBetAmount] = useState<string>('0.1');
  const [showHistory, setShowHistory] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [history, setHistory] = useState<HistoryRound[]>([]);
  const [animateCircle, setAnimateCircle] = useState(false);
  const [playMode, setPlayMode] = useState(false);
  const [isClosingSoon, setIsClosingSoon] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [roundResult, setRoundResult] = useState<{
    won: boolean;
    winnings?: number;
    roundId: number;
    winningTile?: number;
    playerTile?: number;
    playerTiles?: number[];
    game: 'ore' | 'lottery';
    motherlodeHit?: boolean;
  } | null>(null);


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
      setAlreadyBetTiles([]); // Reset already-bet tiles for new round
      setLastBetTiles([]);
      toast.success(`Round #${data.roundId || data.id} started!`);
    };

    const handleGameUpdate = (data: { tiles?: Tile[]; totalVolume?: number; playerCount?: number; status?: string }) => {
      if (currentRound) {
        setCurrentRound({
          ...currentRound,
          ...(data.tiles && { tiles: data.tiles }),
          ...(data.totalVolume !== undefined && { totalVolume: data.totalVolume }),
          ...(data.playerCount !== undefined && { playerCount: data.playerCount }),
          ...(data.status && { status: data.status as any }),
        });
        
        // Log status changes for debugging
        if (data.status) {
          console.log(`Round status updated to: ${data.status}`);
        }
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
      // Handle single bet success
      if (data.tileIndex !== undefined) {
        setAlreadyBetTiles(prev => [...prev, data.tileIndex]);
      }
      toast.success('Bet placed successfully!');
      setSelectedTiles([]);
      // Refresh unified wallet balance after bet
      setTimeout(() => refreshUnifiedBalance(), 2000);
    };

    // Handle batch bet success
    const handleBatchBetSuccess = (data: { bets: Array<{tileIndex: number, amount: number}>, totalAmount: number }) => {
      const betTiles = data.bets.map(b => b.tileIndex);
      setAlreadyBetTiles(prev => [...prev, ...betTiles]);
      setLastBetTiles(betTiles);
      toast.success(`Placed ${data.bets.length} bets totaling ${data.totalAmount.toFixed(4)} SOL!`);
      setSelectedTiles([]);
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

    const handleRoundFinalized = (data: { winner: number; winningTile: number; prizePool: number; vrfProof: string; motherlodeHit?: boolean; roundId: number }) => {
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
      }
    };

    // Handle player-specific win notification
    const handlePlayerWin = (data: { roundId: number; winningTile: number; betAmount: number; winnings: number; prizePool: number; game: string }) => {
      console.log('🎉 Player win received:', data);
      setRoundResult({
        won: true,
        winnings: data.winnings,
        roundId: data.roundId,
        winningTile: data.winningTile,
        game: 'ore',
      });
      setShowResultModal(true);
      toast.success(`🎉 You won ${data.winnings.toFixed(4)} SOL!`);
      // Refresh balance after winning
      setTimeout(() => refreshUnifiedBalance(), 2000);
    };

    // Handle player-specific loss notification
    const handlePlayerLoss = (data: { roundId: number; winningTile: number; playerTile: number; playerTiles?: number[]; betAmount: number; game: string }) => {
      console.log('😢 Player loss received:', data);

      // If we already recorded a win for this round, do not override it with a loss
      setRoundResult((prev) => {
        if (prev?.won && prev.roundId === data.roundId) {
          return prev;
        }
        return {
          won: false,
          roundId: data.roundId,
          winningTile: data.winningTile,
          playerTile: data.playerTile,
          playerTiles: data.playerTiles, // All tiles player bet on
          game: 'ore',
        };
      });

      setShowResultModal(true);
    };

    // Handle debit failure (insufficient on-chain balance)
    const handleDebitFailed = (data: { roundId: number; amount: number; message: string }) => {
      console.error('❌ Bet debit failed:', data);
      toast.error(data.message || 'Your bet could not be processed - insufficient balance');
      // Clear already bet tiles since they were voided
      setAlreadyBetTiles([]);
      setLastBetTiles([]);
      // Refresh balance to show current state
      setTimeout(() => refreshUnifiedBalance(), 1000);
    };

    on('round:started', handleRoundStarted);
    on('round:activated', handleRoundActivated);
    on('round:timer_started', handleTimerStarted);
    on('game:update', handleGameUpdate);
    on('bet:success', handleBetSuccess);
    on('bet:batch_success', handleBatchBetSuccess);
    on('bet:error', handleBetError);
    on('bet:debit_failed', handleDebitFailed);
    on('round:finalizing', handleRoundFinalizing);
    on('round:finalized', handleRoundFinalized);
    on('player:win', handlePlayerWin);
    on('player:loss', handlePlayerLoss);

    return () => {
      off('round:started', handleRoundStarted);
      off('round:activated', handleRoundActivated);
      off('round:timer_started', handleTimerStarted);
      off('game:update', handleGameUpdate);
      off('bet:success', handleBetSuccess);
      off('bet:batch_success', handleBatchBetSuccess);
      off('bet:error', handleBetError);
      off('bet:debit_failed', handleDebitFailed);
      off('round:finalizing', handleRoundFinalizing);
      off('round:finalized', handleRoundFinalized);
      off('player:win', handlePlayerWin);
      off('player:loss', handlePlayerLoss);
    };
  }, [wsConnected, currentRound, lastBetTiles, on, off, refreshUnifiedBalance]);

  // Periodically refresh game status via WebSocket while in play mode
  useEffect(() => {
    if (!wsConnected || !playMode) return;

    const handleStatus = (data: any) => {
      if (!data) return;
      setCurrentRound((prev) => ({
        ...(prev || {}),
        ...data,
        id: data.id || data.roundId?.toString(),
        roundId: data.roundId,
        prizePool: data.prizePool ?? 0,
        totalVolume: data.totalVolume ?? 0,
        playerCount: data.playerCount ?? 0,
      }));
    };

    on('game:status', handleStatus);
    emit('game:get_status', {});

    const interval = setInterval(() => {
      emit('game:get_status', {});
    }, 2500);

    return () => {
      clearInterval(interval);
      off('game:status', handleStatus);
    };
  }, [wsConnected, playMode, emit, on, off]);

  // Track last 2 seconds before round end to prevent late bets
  // Only applies when round is active with a valid endTime
  useEffect(() => {
    // Only track closing time when round is active with a valid future endTime
    if (!currentRound || !currentRound.endTime || currentRound.status !== 'active') {
      setIsClosingSoon(false);
      return;
    }

    const updateFlag = () => {
      const msLeft = currentRound.endTime - Date.now();
      // Only set closing soon if endTime is in the future and less than 2 seconds away
      setIsClosingSoon(msLeft > 0 && msLeft <= 2000);
    };

    updateFlag();
    const interval = setInterval(updateFlag, 250);
    return () => clearInterval(interval);
  }, [currentRound?.endTime, currentRound?.status]);



  const handlePlaceBet = (amount: number) => {
    if (!walletConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!publicKey) {
      toast.error('Wallet not found');
      return;
    }

    // Debug logging
    console.log('Attempting to place bet:', {
      amount,
      currentRound: currentRound ? {
        id: currentRound.id,
        status: currentRound.status,
        playerCount: currentRound.playerCount
      } : null,
      wsConnected,
      walletConnected
    });

    // Block bets only when round is finalizing/finalized
    if (currentRound && (currentRound.status === 'finalizing' || currentRound.status === 'finalized')) {
      toast.error('Round is finalizing. Please wait for the next round.');
      return;
    }

    // Extra safety: block bets in the last 2 seconds before end
    if (isClosingSoon) {
      toast.error('Betting is closed for this round.');
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

    // Use batch betting for better efficiency and consolidated activity broadcast
    const betData = {
      bets: tilesToBet.map(tileIndex => ({ tileIndex, amount })),
      walletAddress: publicKey.toString(),
    };
    console.log('Emitting bet:place_batch:', betData);
    emit('bet:place_batch', betData);
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

    // Prevent selecting tiles already bet on this round
    if (alreadyBetTiles.includes(tileId)) {
      toast.error('You already bet on this tile in this round.');
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
      // Refresh both wallet and unified wallet balances
      setTimeout(() => {
        updateBalance();
        refreshUnifiedBalance();
      }, 1500);
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
      // Refresh both wallet and unified wallet balances
      setTimeout(() => {
        updateBalance();
        refreshUnifiedBalance();
      }, 1500);
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





  const handleClick = () => {
    setAnimateCircle(true);
    setPlayMode(true);
  };

  return (
    
    <div className="min-h-screen font-mono">
      <main className="relative w-full mx-auto px-4 lg:px-8 pt-12 grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr] gap-4 items-start">

        {/* ==================== LEFT SIDEBAR ==================== */}
        <div className={`hidden lg:block space-y-16 transition-all duration-500 ${playMode ? 'blur-md opacity-50 pointer-events-none' : ''}`}>

          {/* Live Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
          >
            <LiveActivity showGame="ore" maxItems={5} />
          </motion.div>

          {/* History Button */}
          <div className="mt-4">
            <GameHistory 
              walletAddress={publicKey?.toString() || null} 
              game="ore" 
            />
          </div>

          {/* Floating Icons - LEFT */}
          <div className="flex flex-col items-end gap-20">
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
            alreadyBetTiles={alreadyBetTiles}
            onTileToggle={handleTileSelection}
            disabled={!walletConnected || !wsConnected || currentRound?.status === 'finalizing' || currentRound?.status === 'finalized'}
            onPlaceBet={handlePlaceBet}
            walletAddress={publicKey?.toString() || null}
          />

          {/* Let's Play Button - Hidden when in play mode */}
          {!playMode && (
            <div className="absolute -bottom-7 z-10 w-full">
              <div className="flex items-center justify-center">
                <Button
                  onClick={handleClick}
                  disabled={
                    !walletConnected ||
                    !wsConnected ||
                    currentRound?.status === "finalizing" ||
                    currentRound?.status === "finalized"
                  }
                  className="relative bg-white hover:bg-white hover:scale-105 text-lg text-black px-20 py-7 rounded-full disabled:cursor-not-allowed overflow-hidden"
                >
                  <motion.div
                    initial={{ x: -70 }}
                    animate={animateCircle ? { x: 100 } : { x: -100 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="absolute w-12 h-12 rounded-full bg-white shadow-md border"
                  />
                  LET'S PLAY
                </Button>
              </div>
            </div>
          )}

          {/* Game Controls Panel (Play Mode) */}
          <AnimatePresence>
            {playMode && (
              <motion.div
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute right-[-420px] top-0 w-[400px] bg-white rounded-lg shadow-2xl border-2 border-gray-200 px-6 py-4 z-50"
              >
                {/* Close Button */}
                <button
                  onClick={() => {
                    setPlayMode(false);
                    setAnimateCircle(false);
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-4">
                  <div className="">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Controls</h2>
                    {/* Status Badge */}
                    <div className="flex justify-start">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                        currentRound?.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : currentRound?.status === 'idle' 
                            ? 'bg-yellow-100 text-yellow-700'
                            : currentRound?.status === 'finalizing'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                      }`}>
                        {currentRound?.status === 'active' ? 'Active' 
                          : currentRound?.status === 'idle' ? 'Waiting for First Bet'
                          : currentRound?.status === 'finalizing' ? 'Finalizing'
                          : currentRound?.status ?? 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs space-y-2"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center">
                        <p className="text-gray-600">Round</p>
                        <p className="font-semibold">
                          #{currentRound?.roundId ?? currentRound?.id ?? '-'}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Players</p>
                        <p className="font-semibold">{currentRound?.playerCount ?? 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Prize Pool (90%)</p>
                        <p className="font-semibold text-green-600">
                          {((currentRound?.totalVolume ?? 0) * 0.9).toFixed(4)} SOL
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Total Volume</p>
                        <p className="font-semibold">{((currentRound?.totalVolume ?? 0).toFixed(4))} SOL</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Bet Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Bet Amount (SOL)</label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => handleBetAmountChange(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.01"
                      min="0.01"
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Selected tiles:</span>
                      <span className="font-semibold text-gray-900">{selectedTiles.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-semibold text-gray-900">
                        {(
                          (parseFloat(betAmount || '0') || 0) * selectedTiles.length
                        ).toFixed(2)}{' '}
                        SOL
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Game balance:</span>
                      <span className="font-semibold text-gray-900">{gameBalance.toFixed(2)} SOL</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold"
                    onClick={() => handlePlaceBet(parseFloat(betAmount))}
                    disabled={
                      !walletConnected ||
                      !wsConnected ||
                      (currentRound && (currentRound.status === 'finalizing' || currentRound.status === 'finalized')) ||
                      isClosingSoon ||
                      selectedTiles.length === 0 ||
                      !betAmount ||
                      Number.isNaN(parseFloat(betAmount)) ||
                      parseFloat(betAmount) <= 0
                    }
                  >
                    Place Bet
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* ==================== RIGHT SIDEBAR ==================== */}
        <div className={`hidden lg:block space-y-16 transition-all duration-500 ${playMode ? 'blur-md opacity-50 pointer-events-none' : ''}`}>

          {/* Animated Text Block */}
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-right"
          >
            <div className="h-[200px] w-full flex justify-start">
              <div className="max-w-sm ml-auto space-y-4">
                <motion.p className="text-sm lg:text-base space-y-2 text-gray-700 font-medium leading-relaxed">
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                    className="block text-muted-foreground text-xs uppercase">
                    Let your balls drop! watch them bounce and hit massive jackpots!
                  </motion.span>


                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8, duration: 1.2 }}
                    className="block text-muted-foreground text-xs uppercase"
                  >
                    The most thrilling onchain pachinko experience.
                  </motion.span>


                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8, duration: 1.2 }}
                    className="block mt-6 text-xs uppercase text-muted-foreground"
                  >
                    Let’s play Pachinko
                  </motion.span>
                </motion.p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col items-start gap-20">
            {rightIcons.map((icon, i) => (
              <FloatingIcon key={icon.label} {...icon} index={i} isRightSide />
            ))}
          </div>
        </div>
      </main>

      {/* Prize Pool*/}
      <div className="absolute bottom-0 w-full py-4 bg-[#D9D9D9] overflow-hidden">
        <div className="flex items-center">
          <p className="text-gray-600 font-semibold text-xl md:text-2xl whitespace-nowrap px-4 shrink-0">TODAY'S PRIZE POOL</p>
          <div className="overflow-hidden flex-1">
            <div className="flex animate-marquee whitespace-nowrap">
              {[...Array(10)].map((_, i) => (
                <span key={i} className="text-xl md:text-3xl lg:text-4xl text-orange-500 mx-8">+$20,000</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-8">
        <Image src="/loop-background.png" alt="Pachinko Background" className="object-cover" height={16} width={400} />
      </div>

      {/* Round Result Modal */}
      <RoundResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        result={roundResult}
      />
    </div>
  );
}