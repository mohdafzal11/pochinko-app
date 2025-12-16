import { useEffect, useState } from 'react';
import { Clock, Trophy, Users, Sparkles } from 'lucide-react';
import { Round } from '@/types/game';
import { motion } from 'framer-motion';

interface RoundTimerProps {
    round: Round | null;
}

export default function RoundTimer({ round }: RoundTimerProps) {
    const [timeLeft, setTimeLeft] = useState(0);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (!round) return;

        const updateTimer = () => {
            const now = Date.now();
            const remaining = Math.max(0, round.endTime - now);
            const totalDuration = round.duration || (round.endTime - round.startTime);
            const progressPercent = totalDuration > 0 ? (remaining / totalDuration) * 100 : 0;

            setTimeLeft(Math.ceil(remaining / 1000));
            setProgress(progressPercent);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 100);
        return () => clearInterval(interval);
    }, [round]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!round) {
        return (
            <motion.div
                // animate={{
                //   boxShadow: ["0 0 20px #000", "0 0 40px #000", "0 0 20px #000"],
                // }}
                transition={{ duration: 3, repeat: Infinity }}
                className="h-20 mx-8 my-2 rounded-lg relative p-[5px]"
                style={{
                    background: "#d4b896",
                }}
            >
                <div
                    className="w-full h-full rounded-md relative overflow-hidden"
                    style={{
                        background:
                            "linear-gradient(to bottom, #4a4742 0%, #3a3530 20%, #2d2b26 50%, #242220 80%, #1a1815 100%)",
                        border: "1px solid #2a2520",
                    }}
                >
                    <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{
                            background:
                                "linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)",
                        }}
                    />

                    <div
                        className="relative z-10 h-full flex items-center justify-center bg-linear-to-r from-[#2B2824] to-[#4A4540]"

                    >
                        <p className="text-[#E0CCA9] font-bold text-lg tracking-wider">
                            WAITING FOR NEXT ROUND...
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            transition={{ duration: 3, repeat: Infinity }}
            className="h-20 mx-8 my-2 rounded-lg relative p-[5px]"
            style={{
                background: '#d4b896',
            }}
        >
            <div
                className="w-full h-full rounded-lg relative overflow-hidden"
                style={{
                    background: 'linear-gradient(to bottom, #4a4742 0%, #3a3530 20%, #2d2b26 50%, #242220 80%, #1a1815 100%)',
                    border: '1px solid #2a2520',
                }}
            >
                {/* Top highlight */}
                <div
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{
                        background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)'
                    }}
                />

                {/* Background Gradient Pulse */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E0CCA9]/10 to-transparent animate-pulse" />

                <div className="relative z-10 h-full flex items-center justify-between px-2 md:px-6 text-[#E0CCA9] font-bold">
                    {/* Left: Round + Timer */}
                    <div className="flex items-center gap-6">
                        <div className="text-lg md:text-3xl font-black tracking-widest">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex items-center gap-8 text-right">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                            <span className="text-lg">{round.totalVolume.toFixed(2)} SOL</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                            <span className="text-xl font-black">{round.prizePool.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20">
                    <span className={`
                        px-4 py-1 rounded-full text-xs font-bold tracking-wider
                        ${round.status === 'active' ? 'bg-green-500/30 text-green-300' : ''}
                        ${round.status === 'idle' ? 'bg-yellow-600/40 text-yellow-300' : ''}
                        ${round.status === 'finalizing' ? 'bg-purple-600/40 text-purple-300 animate-pulse' : ''}
                    `}>
                        {round.status === 'active' && '● LIVE'}
                        {round.status === 'idle' && 'WAITING...'}
                        {round.status === 'finalizing' && 'FINALIZING...'}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}