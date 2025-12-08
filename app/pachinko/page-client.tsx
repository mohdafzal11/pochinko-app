'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-web-socket';
import { useSolanaWallet } from '@/hooks/use-solana-wallet';
import { useUnifiedWallet } from '@/hooks/use-unified-wallet';
import useLottery from '@/hooks/use-lottery';
import { Round, Tile, HistoryRound } from '@/types/game';
import { toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Music, HelpCircle, Package, Store, Sparkles, X, Loader2, Ticket, Trophy, TrendingDown } from "lucide-react";
import FloatingIcon from '@/components/floating-icon';
import { Button } from '@/components/ui/button';
import ConnectWalletModal from '@/components/connect-wallet-modal';

export default function Pachinko() {

  const { isConnected: wsConnected, emit, on, off } = useWebSocket();
  const { isConnected: walletConnected, balance: walletBalance, publicKey } = useSolanaWallet();


  const [animateCircle, setAnimateCircle] = useState(false);
  const [buying, setBuying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'sol' | 'token'>('sol');
  const [playMode, setPlayMode] = useState(false);
  const [betAmount, setBetAmount] = useState<number>(0.1);
  const [ballAmount, setBallAmount] = useState<number>(1);
  const [ballsAnimating, setBallsAnimating] = useState(false);
  const [roundResult, setRoundResult] = useState<{ won: boolean; amount?: number; roundNumber?: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showWalletModal, setShowWalletModal] = useState(false);

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
    fetchStatus,
    fetchUserTickets,
    buyBalls,
    buyBallsWithToken,
    fetchWinners,
  } = useLottery();

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

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
        console.log("Time left:", newTime);
        
        if (newTime <= 0) {
          console.log("Time's up - fetching final status");
          fetchStatus().then(() => {
            setTimeout(() => {
              if (ballsAnimating) {
                console.log("Checking results when time ended");
                setBallsAnimating(false);
                checkRoundResult();
              }
            }, 1000);
          });
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status?.currentRound, ballsAnimating, fetchStatus]);

  useEffect(() => {
    console.log("Status updated:", status);
    console.log("Balls animating:", ballsAnimating);
    
    if (status?.currentRound && 
        status.currentRound.status !== 'Active' && 
        ballsAnimating) {
      console.log("Round ended - checking results");
      setBallsAnimating(false);
      checkRoundResult();
    }
  }, [status, ballsAnimating]);

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

    const cost = ballAmount * betAmount;
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

      toast.success(result.message, {
        description: `New balance: ${result.newBalance.toFixed(4)} ${paymentMethod === 'sol' ? 'SOL' : 'tokens'}`,
      });

      fetchStatus();
      fetchUserTickets(publicKey.toString());
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

  const [activities, setActivities] = useState<any[]>([
    { id: 1, type: "win", amount: 2580 },
    { id: 2, type: "buy", user: "@grinding_negro", text: "bought 69 balls ..." },
    { id: 3, type: "sell", user: "@tetsuodoteth", text: "sold 2 balls" },
  ]);



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
            className="bg-[#E5DFDF24] p-2 border-gray-300 border-1 overflow-hidden rounded-md"
          >
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
                      y: { type: "spring", stiffness: 400, damping: 30 },
                    }}
                    className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 border-1 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {activity.type === "win" ? (
                        <p className="font-bold text-green-600 text-lg truncate">
                          won ${activity.amount.toLocaleString()}
                        </p>
                      ) : (
                        <>
                          <p className="font-sm text-muted-foreground truncate">{activity.user}</p>
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

          <div className={`flex items-center w-full absolute top-0 z-40 h-[620px] transition-all duration-500 ${!ballsAnimating ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {ballsAnimating ? (
              <img 
                src="/pachinko-balls.gif" 
                alt="Pachinko Background" 
                className="object-cover h-full"
                key="playing-gif"
              />
            ) : (
              <img 
                src="/pachinko-balls.gif" 
                alt="Pachinko Background" 
                className="object-cover h-full"
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
                  <h2 className="text-2xl font-bold text-gray-800">Game Controls</h2>

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

                  {/* Bet Amount */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Bet Amount (SOL)</label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      step="0.1"
                      min="0.1"
                    />
                  </div>

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
                      <span className="text-lg font-bold text-gray-900">
                        {(betAmount * ballAmount).toFixed(2)} {paymentMethod === 'sol' ? 'SOL' : 'PACHI'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <Button className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-semibold"
                      onClick={handleBuyBalls}
                      disabled={buying || ballAmount < 1 || showResult || timeLeft <= 0}
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

          {/* Round Result Modal */}
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

                  <div className="text-center space-y-6">
                    {/* Result Icon */}
                    <div className="flex justify-center">
                      {roundResult.won ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center"
                        >
                          <Trophy className="w-10 h-10 text-green-600" />
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center"
                        >
                          <TrendingDown className="w-10 h-10 text-gray-600" />
                        </motion.div>
                      )}
                    </div>

                    {/* Result Text */}
                    <div className="space-y-2">
                      <h2 className={`text-3xl font-bold ${roundResult.won ? 'text-green-600' : 'text-gray-600'}`}>
                        {roundResult.won ? 'YOU WON!' : 'Better Luck Next Time!'}
                      </h2>
                      <p className="text-gray-600">
                        Round #{roundResult.roundNumber}
                      </p>
                      {roundResult.won && roundResult.amount && (
                        <p className="text-2xl font-bold text-green-600">
                          {roundResult.amount.toFixed(4)} SOL
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <Button
                      onClick={() => setShowResult(false)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                    >
                      Continue Playing
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connect Wallet Modal */}
          <ConnectWalletModal 
            isOpen={showWalletModal} 
            onClose={() => setShowWalletModal(false)} 
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