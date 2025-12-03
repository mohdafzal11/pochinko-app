import { useEffect, useState } from 'react';
import { Clock, Trophy, Users, Sparkles } from 'lucide-react';
import { Round } from '@/types/game';
import { motion } from 'framer-motion';

interface RoundTimerProps {
    round: Round | null;
}

export const RoundTimer = ({ round }: RoundTimerProps) => {
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
                animate={{ boxShadow: ["0 0 20px #000", "0 0 40px #000", "0 0 20px #000"] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="h-16 mx-4 bg-black rounded-2xl border-4 border-[#E0CCA9] flex items-center justify-center flex shadow-inner"
            >
                <p className="text-[#E0CCA9] font-bold text-lg tracking-wider">WAITING FOR NEXT ROUND...</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            animate={{
                boxShadow: [
                    "0 0 20px #000",
                    "0 0 50px #E0CCA9",
                    "0 0 20px #000"
                ]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="h-16 mx-4 bg-black rounded-2xl border-4 border-[#E0CCA9] shadow-inner overflow-hidden relative"
        >
            {/* Background Gradient Pulse */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E0CCA9]/10 to-transparent animate-pulse" />

            <div className="h-full flex items-center justify-between px-2 md:px-6 text-[#E0CCA9] font-bold">
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
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                <span className={`
          px-4 py-1 rounded-full text-xs font-bold tracking-wider
          ${round.status === 'active' ? 'bg-green-500/30 text-green-300' : ''}
          ${round.status === 'waiting' ? 'bg-yellow-600/40 text-yellow-300' : ''}
          ${round.status === 'finalizing' ? 'bg-purple-600/40 text-purple-300 animate-pulse' : ''}
        `}>
                    {round.status === 'active' && '● LIVE'}
                    {round.status === 'waiting' && 'WAITING...'}
                    {round.status === 'finalizing' && 'FINALIZING...'}
                </span>
            </div>
        </motion.div>
    );
};