'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks/use-web-socket';
import { useSolanaWallet } from '@/hooks/use-solana-wallet';
import { useUnifiedWallet } from '@/hooks/use-unified-wallet';
import { useLottery } from '@/hooks/use-lottery';
import MachineSelector, { MachineInfo, useMachines } from '@/components/machine-selector';
import { Round, Tile, HistoryRound } from '@/types/game';
import { toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Music, HelpCircle, Package, Store, Sparkles, X, Loader2, Ticket, Trophy, TrendingDown, History, Coins } from "lucide-react";
import FloatingIcon from '@/components/floating-icon';
import { Button } from '@/components/ui/button';
import ConnectWalletModal from '@/components/connect-wallet-modal';
import HowToPlayModal from '@/components/how-to-play-modal';
import InventoryModal from '@/components/inventory-modal';
import LiveActivity from '@/components/live-activity';
import GameHistory from '@/components/game-history';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Pachinko() {

  const { isConnected: wsConnected, emit, on, off } = useWebSocket();
  const { isConnected: walletConnected, balance: walletBalance, publicKey } = useSolanaWallet();
  const router = useRouter();

  // Machine selection state
  const [selectedMachineId, setSelectedMachineId] = useState<string>('sol');
  const { machines, loading: machinesLoading } = useMachines();

  const [animateCircle, setAnimateCircle] = useState(false);
  const [buying, setBuying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'sol' | 'token'>('sol');
  const [playMode, setPlayMode] = useState(false);
  // Ball price is determined by the machine, not user input
  const [ballAmount, setBallAmount] = useState<number>(1);
  const [ballsAnimating, setBallsAnimating] = useState(false);
  const [roundResult, setRoundResult] = useState<{ won: boolean; amount?: number; roundNumber?: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);

  // Get current selected machine info
  const currentMachine = machines.find(m => m.id === selectedMachineId) || machines[0];

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

  const {
    status,
    userTickets,
    loading,
    error,
    purchasing,
    lastRoundResult,
    isConnected: lotteryWsConnected,
    currentMachine: lotteryMachine,
    fetchStatus,
    fetchUserTickets,
    buyBalls,
    buyBallsWithToken,
    fetchWinners,
  } = useLottery(selectedMachineId);

  // WebSocket automatically fetches status on connection, no polling needed
  // Status updates are received in real-time via WebSocket

  useEffect(() => {
    if (status?.currentRound?.timeRemaining) {
      setTimeLeft(status.currentRound.timeRemaining);
    }
  }, [status?.currentRound?.timeRemaining]);

  useEffect(() => {
    if (!status?.currentRound || status.currentRound.status !== 'Active') {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        const newTime = prevTime - 1;
        if (newTime <= 0) {
          // WebSocket will notify us when round ends, no need to poll
          if (ballsAnimating) {
            console.log("Timer ended - waiting for WebSocket round result");
          }
        }
        return Math.max(0, newTime);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.currentRound, ballsAnimating]);

  // Track previous round number to detect new rounds
  const [prevRoundNumber, setPrevRoundNumber] = useState<number | null>(null);

  useEffect(() => {
    console.log("Status updated:", status);
    console.log("Balls animating:", ballsAnimating);
    
    // Early return if no status
    if (!status) return;
    
    // Detect new round starting - reset animation
    if (status.currentRound?.roundNumber && 
        prevRoundNumber !== null && 
        status.currentRound.roundNumber > prevRoundNumber &&
        status.currentRound.status === 'Active') {
      console.log("New round detected - resetting animation");
      setBallsAnimating(false);
      setShowResult(false);
      setRoundResult(null);
    }
    
    // Update previous round number
    if (status.currentRound?.roundNumber !== prevRoundNumber) {
      setPrevRoundNumber(status.currentRound?.roundNumber || null);
    }
    
    // Round ended - stop animation and check results
    if (status.currentRound && 
        status.currentRound.status !== 'Active' && 
        ballsAnimating) {
      console.log("Round ended - checking results");
      setBallsAnimating(false);
      checkRoundResult();
    }
  }, [status, ballsAnimating, prevRoundNumber]);

  // Handle WebSocket round finalization result
  useEffect(() => {
    if (lastRoundResult && publicKey) {
      console.log("[WS] Round finalized via WebSocket:", lastRoundResult);
      const userWin = lastRoundResult.winners?.find(
        (w) => w.wallet === publicKey.toString() || w.wallet.startsWith(publicKey.toString().slice(0, 8))
      );
      
      if (userWin) {
        console.log("🎉 USER WON LOTTERY!", userWin);
        setRoundResult({
          won: true,
          amount: userWin.prize,
          roundNumber: lastRoundResult.roundNumber
        });
        setShowResult(true);
        setBallsAnimating(false);
        
        // Show toast notification
        toast.success('🎉 Congratulations!', {
          description: `You won ${(userWin.prize / 1e9).toFixed(4)} SOL in Round #${lastRoundResult.roundNumber}!`,
          duration: 5000,
        });
      } else if (userTickets?.currentRound?.ticketCount && userTickets.currentRound.ticketCount > 0) {
        console.log("😢 User participated but didn't win");
        setRoundResult({
          won: false,
          roundNumber: lastRoundResult.roundNumber
        });
        setShowResult(true);
        setBallsAnimating(false);
        
        // Show toast notification
        toast.info('Round Complete', {
          description: `Round #${lastRoundResult.roundNumber} ended. Better luck next time!`,
          duration: 3000,
        });
      }
    }
  }, [lastRoundResult, publicKey, userTickets]);

  const checkRoundResult = async () => {
    console.log("checkRoundResult called");
    console.log("publicKey:", publicKey);
    console.log("status:", status);
    console.log("ballsAnimating:", ballsAnimating);
    
    if (!publicKey || !status?.currentRound) {
      console.log("Early return - missing publicKey or currentRound");
      return;
    }
    
    try {
      console.log("Fetching winners for round:", status.currentRound.roundNumber);
      const winners = await fetchWinners(status.currentRound.roundNumber);
      const userWin = winners.find((winner: any) => winner.walletAddress === publicKey.toString());
      console.log("Winners:", winners);
      console.log("User Win:", userWin);
      console.log("User Tickets:", userTickets);
      console.log("User ticket count:", userTickets?.currentRound?.ticketCount);
      
      if (userWin) {
        console.log("User WON - setting win result");
        setRoundResult({
          won: true,
          amount: userWin.prizeAmount,
          roundNumber: status.currentRound.roundNumber
        });
      } else if (userTickets?.currentRound?.ticketCount && userTickets.currentRound.ticketCount > 0) {
        console.log("User participated but didn't win - setting loss result");
        setRoundResult({
          won: false,
          roundNumber: status.currentRound.roundNumber
        });
      } else {
        console.log("User didn't participate in this round");
      }
      
      console.log("Setting showResult to true");
      setShowResult(true);
    } catch (error) {
      console.error('Error checking round result:', error);
    }
  };

  useEffect(() => {
    if (publicKey) {
      fetchUserTickets(publicKey.toString());
    }
  }, [publicKey, fetchUserTickets]);

  const handleBuyBalls = async () => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (ballAmount < 1 || ballAmount > 200) {
      toast.error('Quantity must be between 1 and 200');
      return;
    }

    // Calculate cost using machine ball price
    const ballPrice = currentMachine ? currentMachine.baseBallPrice / Math.pow(10, currentMachine.tokenDecimals) : 0.01;
    const cost = ballAmount * ballPrice;
    if (paymentMethod === 'sol') {
      if (unifiedBalance < cost) {
        toast.error(`Insufficient SOL balance. Need ${cost.toFixed(4)} SOL, have ${unifiedBalance.toFixed(4)} SOL`);
        return;
      }
    } else {
      if (unifiedBalance < cost) {
        toast.error(`Insufficient token balance. Need ${cost.toFixed(4)} tokens, have ${unifiedBalance.toFixed(4)} tokens`);
        return;
      }
    }

    setBuying(true);
    setBallsAnimating(true);
    try {
      const result = paymentMethod === 'sol'
        ? await buyBalls(publicKey.toString(), ballAmount)
        : await buyBallsWithToken(publicKey.toString(), ballAmount);

      toast.success(result.message || `Successfully purchased ${ballAmount} balls!`, {
        description: result.newBalance ? `New balance: ${result.newBalance.toFixed(4)} ${paymentMethod === 'sol' ? 'SOL' : 'tokens'}` : undefined,
      });

      // WebSocket automatically broadcasts updated status - no need to fetch manually
      // Tickets are also updated via WebSocket
      fetchUserTickets(publicKey.toString()); // Just update user's tickets
    } catch (err: any) {
      console.error('Error buying balls:', err);
      toast.error('Failed to buy balls', {
        description: err.message,
      });
      setBallsAnimating(false);
    } finally {
      setBuying(false);
    }
  };

  const currentRound = status?.currentRound;

  const handleMarketplaceClick = () => {
    router.push('/pachinko/marketplace');
  };

  const leftIcons = [
    { Icon: Gamepad2, color: "bg-[#FFD374]", label: "CONSOLE", offset: false },
    { Icon: Music, color: "bg-[#DD5622]", label: "MUSIC", offset: true },
    { Icon: HelpCircle, color: "bg-[#749CFF]", label: "HOW TO PLAY?", offset: false, onClick: () => setShowHowToPlayModal(true) },
  ];

  const rightIcons = [
    { Icon: Package, color: "bg-[#FF7492]", label: "INVENTORY", offset: false, onClick: () => setShowInventoryModal(true) },
    { Icon: Store, color: "bg-[#F48C8C]", label: "MARKETPLACE", offset: true, onClick: handleMarketplaceClick },
    { Icon: Gamepad2, color: "bg-[#DAE998]", label: "MACHINES", offset: false },
  ];

  const handleClick = () => {
    if (!walletConnected) {
      setShowWalletModal(true);
      return;
    }
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
            <LiveActivity showGame="lottery" maxItems={5} />
          </motion.div>

          {/* History Button */}
          <div className="mt-4">
            <GameHistory 
              walletAddress={publicKey?.toString() || null} 
              game="lottery" 
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
        <div className="relative h-[820px] w-full">
          <img src="/pachinko.jpeg" alt="" className="h-full w-full object-contain" />

          {!playMode && <div className="absolute bottom-44 z-50 w-full">
            <div className="flex items-center justify-center">
              <Button
                onClick={handleClick}
              
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
          </div>}

          <div className={`flex items-center justify-center w-full absolute top-0 left-0 right-0 z-40 h-[620px] transition-all duration-500 ${!ballsAnimating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {ballsAnimating ? (
              <img 
                src="/pachinko-balls.gif" 
                alt="Pachinko Background" 
                className="object-contain h-full max-w-full"
                key="playing-gif"
              />
            ) : (
              <img 
                src="/pachinko-balls.gif" 
                alt="Pachinko Background" 
                className="object-contain h-full max-w-full"
                key="stopped-gif"
                style={{ animationPlayState: 'paused' }}
              />
            )}
          </div>

          {/* Play Mode Modal */}
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
                  onClick={() => setPlayMode(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-800">Game Controls</h2>
                    {/* Machine Selector */}
                    {machines.length > 1 && (
                      <MachineSelector
                        machines={machines}
                        selectedMachine={selectedMachineId}
                        onSelectMachine={setSelectedMachineId}
                        compact={true}
                        disabled={ballsAnimating}
                      />
                    )}
                  </div>

                  {/* Current Machine Info */}
                  {currentMachine && (
                    <div 
                      className="px-3 py-2 rounded-lg border flex items-center gap-2"
                      style={{ 
                        backgroundColor: currentMachine.theme.primaryColor + '10',
                        borderColor: currentMachine.theme.primaryColor + '30',
                      }}
                    >
                      <span className="text-xl">{currentMachine.theme.icon}</span>
                      <div className="flex-1">
                        <span className="text-sm font-bold" style={{ color: currentMachine.theme.primaryColor }}>
                          {currentMachine.tokenSymbol}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">{currentMachine.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">Ball Price</div>
                        <div className="text-sm font-mono font-bold" style={{ color: currentMachine.theme.primaryColor }}>
                          {(currentMachine.baseBallPrice / Math.pow(10, currentMachine.tokenDecimals)).toFixed(
                            currentMachine.tokenDecimals > 6 ? 4 : 2
                          )} {currentMachine.tokenSymbol}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentRound?.status === "Active" && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="bg-orange-50 border border-orange-200 rounded-lg p-2"
                    >
                      <div className="text-center space-y-3">


                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-center">
                            <p className="text-gray-600">Round</p>
                            <p className="font-semibold">#{currentRound.roundNumber}</p>
                          </div>
                          <div className="flex flex-col justify-between">
                            <span className="text-gray-600">Time Left:</span>
                            <span className="font-semibold text-green-600">
                              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toFixed(0).padStart(2, '0')}
                            </span>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Players</p>
                            <p className="font-semibold">{currentRound.participantCount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-600">Balls</p>
                            <p className="font-semibold">{currentRound.totalBalls}</p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-orange-200">
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Prize Pool</p>
                            <p className="text-lg font-bold text-orange-500">
                              ${currentRound.prizePool.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Your Tickets */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="px-4 py-3 border-gray-300 border-1 rounded-md"
                  >
                    <h3 className="text-sm font-bold text-gray-800 mb-3">YOUR TICKETS</h3>
                    {userTickets ? (
                      userTickets.currentRound && userTickets.currentRound.ticketCount > 0 ? (
                        <div className="space-y-3">

                          <p className="text-sm text-gray-600">
                            <span className="text-sm font-bold text-orange-500">
                              {userTickets.currentRound.ticketCount}
                            </span> balls in current round (Round #{userTickets.currentRound.roundNumber})
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No balls in this round yet</p>
                      )
                    ) : (
                      <p className="text-sm text-gray-500">Connect wallet to see</p>
                    )}
                  </motion.div>

                  {/* Balls Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Buy Lottery Balls</label>
                    <input
                      type="number"
                      value={ballAmount}
                      onChange={(e) => setBallAmount(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="1"
                      min="1"
                      max="200"
                    />
                  </div>

                  {/* Cost Display */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cost:</span>
                      <span className="text-lg font-bold" style={{ color: currentMachine?.theme.primaryColor || '#1a1a2e' }}>
                        {currentMachine ? (
                          <>
                            {((currentMachine.baseBallPrice / Math.pow(10, currentMachine.tokenDecimals)) * ballAmount).toFixed(
                              currentMachine.tokenDecimals > 6 ? 4 : 2
                            )} {currentMachine.tokenSymbol}
                          </>
                        ) : (
                          <>
                            {(0.01 * ballAmount).toFixed(2)} SOL
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold"
                      onClick={handleBuyBalls}
                      disabled={
                        buying || 
                        ballAmount < 1 || 
                        showResult || 
                        !currentRound ||
                        currentRound.status === 'Ended' ||
                        currentRound.status === 'Finalized' ||
                        (currentRound.status === 'Active' && timeLeft <= 2)
                      }
                    >
                      {buying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Buying...
                        </>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4 mr-2" />
                          Buy {ballAmount} Ball{ballAmount > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>

                  </div>


                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lottery Result Modal */}
          <AnimatePresence>
            {showResult && roundResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 flex items-center justify-center z-50"
              >
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowResult(false)} />
                <motion.div
                  initial={{ y: 50 }}
                  animate={{ y: 0 }}
                  className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setShowResult(false)}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>

                  {roundResult.won ? (
                    <>
                      {/* Win State */}
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                          className="w-24 h-24 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
                        >
                          <Trophy className="w-12 h-12 text-white" />
                        </motion.div>
                        <motion.h2 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 mb-2"
                        >
                          WINNER!
                        </motion.h2>
                        <p className="text-gray-600 mb-4 font-medium">Your balls hit the jackpot!</p>
                        
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 }}
                          className="bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 rounded-xl p-6 mb-6 border-2 border-orange-200"
                        >
                          <p className="text-sm text-gray-600 mb-2 font-semibold">Prize Amount</p>
                          <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 mb-2">
                            {roundResult.amount ? `${(roundResult.amount / 1e9).toFixed(4)}` : '0.0000'}
                          </p>
                          <p className="text-2xl font-bold text-orange-600">SOL</p>
                          
                          <div className="mt-4 pt-4 border-t border-orange-200">
                            <p className="text-xs text-gray-500">Round #{roundResult.roundNumber || status?.currentRound?.roundNumber}</p>
                            <p className="text-xs text-gray-500 mt-1">Lottery: {currentMachine?.name || 'SOL'}</p>
                            {userTickets?.currentRound?.ticketCount && (
                              <p className="text-xs text-gray-500 mt-1">Your Balls: {userTickets.currentRound.ticketCount}</p>
                            )}
                          </div>
                        </motion.div>
                        
                        <p className="text-sm text-green-600 font-medium mb-4">Prize credited to your unified wallet</p>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Loss State */}
                      <div className="text-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: "spring" }}
                          className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
                        >
                          <Ticket className="w-10 h-10 text-white" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Round Complete</h2>
                        <p className="text-gray-600 mb-6">Your balls didn't win this time, but keep trying!</p>
                        
                        <div className="bg-gray-50 rounded-xl p-4 mb-6">
                          <p className="text-sm text-gray-600 mb-2">Round #{roundResult.roundNumber || status?.currentRound?.roundNumber}</p>
                          <p className="text-sm text-gray-600">Lottery: {currentMachine?.name || 'SOL'}</p>
                          {userTickets?.currentRound?.ticketCount && (
                            <p className="text-sm text-gray-600 mt-1">Your Balls: {userTickets.currentRound.ticketCount}</p>
                          )}
                        </div>
                        
                        <p className="text-sm text-blue-600 font-medium">Buy more balls for the next round!</p>
                      </div>
                    </>
                  )}

                    {/* Action Button */}
                    <Button
                      onClick={() => setShowResult(false)}
                      className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-lg font-semibold shadow-lg"
                    >
                      {roundResult.won ? 'Play Again' : 'Try Again'}
                    </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connect Wallet Modal */}
          <ConnectWalletModal 
            isOpen={showWalletModal} 
            onClose={() => setShowWalletModal(false)} 
          />

          {/* How to Play Modal */}
          <HowToPlayModal 
            isOpen={showHowToPlayModal} 
            onClose={() => setShowHowToPlayModal(false)} 
            content={{
              title: 'ボール',
              subtitle: 'BUY BALLS',
              totalPages: 2,
              pages:[{
                description: ['You need balls to win' , "You currently have X Balls"],
              },{
                description: ['To play you need to build up your inventory'],
              }]
            }}
          />

          {/* Inventory Modal */}
          <InventoryModal 
            isOpen={showInventoryModal} 
            onClose={() => setShowInventoryModal(false)} 
            page="pachinko"
          />
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
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="block text-muted-foreground text-xs uppercase"
                  >
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
                    Let's play Pachinko
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
      <div className="absolute z-10 bottom-0 w-full py-4 bg-[#D9D9D9]">
        <div className="mx-auto px-8 flex items-center justify-center gap-10 sm:gap-20 text-center">
          <p className="text-gray-600 font-semibold text-xl md:text-2xl">TODAY'S PRIZE POOL</p>
          <span className="text-xl md:text-3xl lg:text-4xl text-orange-500">+$20,000</span>
          <span className="hidden md:block text-xl md:text-3xl lg:text-4xl text-orange-500">+$20,000</span>
          <span className="hidden lg:block text-xl md:text-3xl lg:text-4xl text-orange-500">+$20,000</span>
        </div>
      </div>



      <div className="px-8">
        <Image src="/loop-background.png" alt="Pachinko Background" className="object-cover" height={60} width={400} />
      </div>
    </div>
  );
}