import { useState, useEffect } from 'react';
import { Sparkles, Clock, History, Users, Trophy, X, ExternalLink } from 'lucide-react';
import { Tile, Round } from '@/types/game';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTitle, DialogDescription, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { API_ENDPOINTS } from '@/config/api';
import RoundTimer from './round-timer';

interface GameGridProps {
    round: Round | null;
    tiles: Tile[];
    selectedTiles: number[];
    alreadyBetTiles?: number[]; // Tiles already bet on this round
    onTileToggle: (tile: number) => void;
    onPlaceBet?: (amount: number) => void;
    disabled?: boolean;
    walletAddress: string | null;
}

interface PlayerBet {
    walletAddress: string;
    tileIndex: number;
    amount: number;
    won: boolean;
    winnings?: number;
}

interface PlayerStats {
    roundsPlayed: number;
    totalBets: number;
    totalWagered: number;
    totalWins: number;
    totalWinnings: number;
    netProfit: number;
}

interface RoundHistory {
    roundId: number;
    startTime: number;
    endTime: number;
    winningTile: number;
    totalVolume: number;
    prizePool: number;
    playerCount: number;
    motherlodeHit: boolean;
    vrfSeed?: string;
    playerBets: PlayerBet[];
    winners: { walletAddress: string; amount: number }[];
}

const GameGrid = ({
    round,
    tiles,
    selectedTiles,
    alreadyBetTiles = [],
    onTileToggle,
    onPlaceBet,
    disabled = false,
    walletAddress,
}: GameGridProps) => {
    const [hoveredTile, setHoveredTile] = useState<number | null>(null);
    const [betAmount, setBetAmount] = useState<string>('0.1');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const [rounds, setRounds] = useState<RoundHistory[]>([]);
    const [stats, setStats] = useState<PlayerStats | null>(null);
    const [loading, setLoading] = useState(false);

    const handlePlaceBet = () => {
        const amount = parseFloat(betAmount);
        if (amount > 0 && onPlaceBet) onPlaceBet(amount);
    };

    useEffect(() => {
        if (isHistoryOpen && walletAddress) {
            fetchHistory();
        }
    }, [isHistoryOpen, walletAddress]);

    const fetchHistory = async () => {
        if (!walletAddress) return;

        setLoading(true);
        try {
            const baseUrl = API_ENDPOINTS.HEALTH.replace('/health', '');
            const response = await fetch(`${baseUrl}/history/${walletAddress}`);
            const data = await response.json();

            if (data.success) {
                setRounds(data.rounds || []);
                setStats(data.stats || null);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!tiles || tiles.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center min-h-[500px] bg-[#c41e3a] rounded-[40px] p-6 shadow-2xl"
            >
                <p className="text-[#fef08a] font-black text-2xl animate-pulse">Loading tiles...</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
            className="relative bg-[#EE3E35] w-full max-w-xl mx-auto rounded-[40px] shadow-2xl overflow-hidden
         border-8 border-black/10 py-2 px-4"
        >
            {/* Top Bar */}
            <RoundTimer round={round} />

            {/* {round &&
                <div className='w-full flex items-center justify-between px-4 pt-2'>
                    <div className="w-full flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3 text-[#E0CCA9] font-bold">
                            <Clock className="w-6 h-6 text-[#E0CCA9] animate-pulse" />
                            <span className="text-xl tracking-wider">ROUND #{round.id}</span>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-[#E0CCA9] font-bold">
                                <Users className="w-5 h-5" />
                                <span className="text-lg">{round.playerCount}</span>
                            </div>
                            <Button
                                onClick={() => { setIsHistoryOpen(true) }}
                                className="flex items-center gap-2 text-[#E0CCA9] font-bold">

                                <History className="w-5 h-5" />
                                <span className="text-lg">History</span>

                            </Button>
                        </div>
                    </div>
                </div>

            } */}

            {/* 5×5 Grid */}
            <div className="grid grid-cols-5 grid-rows-5 gap-3 px-12 sm:px-16 py-2">
                {tiles.map((tile, index) => {
                    const isSelected = selectedTiles.includes(tile.id);
                    const isHovered = hoveredTile === tile.id;
                    const hasBets = tile.bets > 0;
                    const isAlreadyBet = alreadyBetTiles.includes(tile.id);
                    const isTileDisabled = disabled || isAlreadyBet;

                    return (
                        <motion.button
                            key={tile.id}
                            layout
                            initial={{ opacity: 0, y: 60, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                delay: index * 0.02,
                                type: "spring",
                                stiffness: 800,
                                damping: 14,
                            }}
                            whileHover={!isTileDisabled ? { scale: 1.18, y: -10 } : {}}
                            whileTap={!isTileDisabled ? { scale: 0.95 } : {}}
                            onClick={() => !isTileDisabled && onTileToggle(tile.id)}
                            onMouseEnter={() => !isTileDisabled && setHoveredTile(tile.id)}
                            onMouseLeave={() => setHoveredTile(null)}
                            disabled={isTileDisabled}
                            className={`relative rounded-sm overflow-hidden transition-all duration-300 h-16 w-16 border-[1px] border-[#3d2817]
                  ${isTileDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                  ${isSelected ? 'ring-4 ring-[#fef08a] ring-offset-2 ring-offset-[#c41e3a]' : ''}
                  ${isAlreadyBet ? 'ring-2 ring-green-500 ring-offset-1' : ''}
                `}
                        >
                            <motion.div
                                animate={{
                                    backgroundColor: isAlreadyBet
                                        ? "#86efac" // Green for already bet
                                        : isSelected
                                            ? "#fde68a"
                                            : isHovered && !isTileDisabled
                                                ? "#fde68a"
                                                : "#e8d4b8",
                                }}
                                className="absolute inset-0"
                            />

                            <AnimatePresence>
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1.4, opacity: 0 }}
                                        exit={{ scale: 1.6, opacity: 0 }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        className="absolute inset-0 rounded-xl bg-[#fef08a]/50"
                                    />
                                )}
                            </AnimatePresence>

                            <div className="relative h-full flex flex-col items-center justify-center p-3">
                                {/* Main Number - Always Centered */}
                                <motion.span
                                    animate={{ scale: isSelected ? [1, 1.25, 1] : 1 }}
                                    transition={{ duration: 0.6, repeat: isSelected ? Infinity : 0 }}
                                    className="text-lg md:text-2xl font-black text-[#c41e3a] drop-shadow-lg z-10"
                                >
                                    {/* {tile.position} */}
                                </motion.span>

                                {/* Sparkles Icon - Absolute, Never Affects Layout */}
                                <AnimatePresence>
                                    {isSelected && (
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            exit={{ scale: 0, rotate: 180 }}
                                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                                            className="absolute top-2 right-2 pointer-events-none"
                                        >
                                            <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400 drop-shadow-glow animate-pulse" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Bets Counter - Only When Has Bets */}
                                <AnimatePresence>
                                    {hasBets && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="flex flex-col items-center z-10"
                                        >
                                            <span className="text-[10px] text-[#c41e3a]/80 font-medium">
                                                {tile.volume.toFixed(2)} SOL
                                            </span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* HISTORY MODAL */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="text-kode-monu w-full max-w-[95vw] md:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-kode-monu">
                            Betting History
                        </DialogTitle>
                        <DialogDescription className="text-kode-monu">
                            View your past betting rounds and performance
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 w-full">
                        {stats && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                                {[
                                    {
                                        label: "Rounds",
                                        value: stats.roundsPlayed,
                                        className: "text-kode-monu"
                                    },
                                    {
                                        label: "Win Rate",
                                        value: `${stats.roundsPlayed > 0 ? ((stats.totalWins / stats.roundsPlayed) * 100).toFixed(1) : 0}%`,
                                        className: "text-green-500"
                                    },
                                    {
                                        label: "Wagered",
                                        value: `${stats.totalWagered.toFixed(2)} SOL`,
                                        className: "text-kode-monu"
                                    },
                                    {
                                        label: "Won",
                                        value: `${stats.totalWinnings.toFixed(2)} SOL`,
                                        className: stats.totalWinnings > stats.totalWagered ? "text-green-500" : "text-kode-monu"
                                    },
                                    {
                                        label: "Net Profit",
                                        value: `${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toFixed(4)} SOL`,
                                        className: stats.netProfit >= 0 ? "text-green-500" : "text-red-500"
                                    },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className="bg-background border rounded-lg p-3 w-full"
                                    >
                                        <p className="text-xs text-muted-foreground">{item.label}</p>
                                        <p className={`text-sm font-medium ${item.className}`}>
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="h-[60vh] overflow-y-auto pr-2 w-full">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-muted-foreground">Loading your history...</p>
                                </div>
                            ) : rounds.length === 0 ? (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-muted-foreground">No history yet. Time to play!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {rounds.map((r) => {
                                        const myBets = r.playerBets.filter(b => b.walletAddress === walletAddress);
                                        const won = myBets.some(b => b.won);
                                        const wagered = myBets.reduce((s, b) => s + b.amount, 0);
                                        const winnings = myBets.reduce((s, b) => s + (b.winnings || 0), 0);

                                        return (
                                            <motion.div
                                                key={r.roundId}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="bg-background border rounded-lg p-4 space-y-4 w-full"
                                            >
                                                {/* Round Header */}
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                                    <div className="flex items-center gap-3">
                                                        {won ? (
                                                            <Trophy className="w-5 h-5 text-green-500" />
                                                        ) : (
                                                            <X className="w-5 h-5 text-red-500" />
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-medium">Round #{r.roundId}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(r.endTime).toLocaleDateString('en-US', {
                                                                    year: "numeric",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit"
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className={`text-sm font-medium ${won ? "text-green-500" : "text-red-500"}`}>
                                                        {won ? "+" : "-"}
                                                        {won ? winnings.toFixed(4) : wagered.toFixed(4)} SOL
                                                    </p>
                                                </div>

                                                {/* Your Bets */}
                                                {myBets.length > 0 && (
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-semibold mb-2">Your Bets:</p>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {myBets.map((bet, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`bg-muted/50 p-2 rounded-lg ${bet.won ? "bg-green-500/10" : ""}`}
                                                                >
                                                                    <p className="text-xs text-muted-foreground">Tile #{bet.tileIndex + 1}</p>
                                                                    <p className="text-sm font-medium">{bet.amount.toFixed(4)} SOL</p>
                                                                    {bet.won && bet.winnings !== undefined && (
                                                                        <p className="text-xs text-green-500">Won: +{bet.winnings.toFixed(4)} SOL</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                                    <div className="bg-muted/50 p-2 rounded-lg text-center">
                                                        <p className="text-muted-foreground text-xs">Winner</p>
                                                        <p className="font-medium">#{(r.winningTile ?? 0) + 1}</p>
                                                    </div>
                                                    <div className="bg-muted/50 p-2 rounded-lg text-center">
                                                        <p className="text-muted-foreground text-xs">Prize</p>
                                                        <p className="font-medium">{r.prizePool.toFixed(2)} SOL</p>
                                                    </div>
                                                    <div className="bg-muted/50 p-2 rounded-lg text-center">
                                                        <p className="text-muted-foreground text-xs">Players</p>
                                                        <p className="font-medium">{r.playerCount || 0}</p>
                                                    </div>
                                                    <div className="bg-muted/50 p-2 rounded-lg text-center">
                                                        <p className="text-muted-foreground text-xs">Volume</p>
                                                        <p className="font-medium">{(r.totalVolume || 0).toFixed(2)} SOL</p>
                                                    </div>
                                                </div>

                                                {/* VRF */}
                                                {r.vrfSeed && r.vrfSeed !== "mock_vrf" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full hover:bg-primary/20"
                                                        onClick={() =>
                                                            window.open(
                                                                `https://explorer.solana.com/tx/${r.vrfSeed}?cluster=devnet`,
                                                                "_blank"
                                                            )
                                                        }
                                                    >
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        Verify VRF Proof
                                                    </Button>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>




            {/* Bottom Section - Bet Input + Place Bet */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className=""
            >
                <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 px-6 py-2">
                    <div className="flex-1 text-center sm:text-left">
                        <motion.p className="outline-text text-3xl tracking-wide">
                            ブロックパッド
                        </motion.p>

                        <motion.p
                            initial={{ x: -50 }}
                            animate={{ x: 0 }}
                            className="text-5xl  text-[#E2CEAB] font-black tracking-widest drop-shadow-2xl"
                        >
                            BLOCKPAD
                        </motion.p>
                    </div>

                    <div className=" grid grid-cols-2 gap-3">
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 60, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`relative rounded-sm overflow-hidden transition-all duration-300 h-10 w-10 border-[1px] border-[#3d2817]
                  
                `}
                        >
                            <motion.div
                                animate={{
                                    backgroundColor: "#e8d4b8"
                                }}
                                className="absolute inset-0"
                            />

                            <div className="relative h-full flex flex-col items-center justify-center p-3">
                                <motion.span
                                    className="text-lg md:text-2xl font-black text-[#c41e3a] drop-shadow-lg z-10"
                                >
                                    {/* {tile.position} */}
                                </motion.span>

                            </div>
                        </motion.div>
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 60, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`relative rounded-sm overflow-hidden transition-all duration-300 h-10 w-10 border-[1px] border-[#3d2817]
                  
                `}
                        >
                            <motion.div
                                animate={{
                                    backgroundColor: "#e8d4b8"
                                }}
                                className="absolute inset-0"
                            />

                            <div className="relative h-full flex flex-col items-center justify-center p-3">
                                <motion.span
                                    className="text-lg md:text-2xl font-black text-[#c41e3a] drop-shadow-lg z-10"
                                >
                                    {/* {tile.position} */}
                                </motion.span>

                            </div>
                        </motion.div>
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 60, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            className={`relative rounded-sm overflow-hidden transition-all duration-300 h-10 w-10 border-[1px] border-[#3d2817]
                  
                `}
                        >
                            <motion.div
                                animate={{
                                    backgroundColor: "#e8d4b8"
                                }}
                                className="absolute inset-0"
                            />

                            <div className="relative h-full flex flex-col items-center justify-center p-3">
                                <motion.span
                                    className="text-lg md:text-2xl font-black text-[#c41e3a] drop-shadow-lg z-10"
                                >
                                    {/* {tile.position} */}
                                </motion.span>

                            </div>
                        </motion.div>
                    </div>

                </div>
            </motion.div>

        </motion.div>
    );
};

export default GameGrid