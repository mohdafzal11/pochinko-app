'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingDown, X, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

interface RoundResultProps {
  isOpen: boolean;
  onClose: () => void;
  result: {
    won: boolean;
    winnings?: number;
    roundId: number;
    winningTile?: number;
    playerTile?: number;
    game: 'ore' | 'lottery';
    motherlodeHit?: boolean;
  } | null;
}

export default function RoundResultModal({ isOpen, onClose, result }: RoundResultProps) {
  // Trigger confetti on win (if canvas-confetti is available)
  useEffect(() => {
    if (isOpen && result?.won) {
      // Dynamically import canvas-confetti to avoid build errors
      import('canvas-confetti').then((confettiModule) => {
        const confetti = confettiModule.default;
        const duration = 3000;
        const end = Date.now() + duration;

        const runConfetti = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFD700', '#FFA500', '#FF6347'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FFD700', '#FFA500', '#FF6347'],
          });

          if (Date.now() < end) {
            requestAnimationFrame(runConfetti);
          }
        };

        runConfetti();
      }).catch(() => {
        // canvas-confetti not available, skip confetti effect
        console.log('Confetti effect not available');
      });
    }
  }, [isOpen, result?.won]);

  if (!result) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
              result.won 
                ? 'bg-gradient-to-br from-green-50 to-yellow-50' 
                : 'bg-gradient-to-br from-gray-50 to-gray-100'
            }`}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-full transition-colors z-10"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Motherlode Banner */}
            {result.motherlodeHit && (
              <motion.div
                initial={{ y: -50 }}
                animate={{ y: 0 }}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-2 text-center font-bold"
              >
                <Sparkles className="inline w-4 h-4 mr-2" />
                MOTHERLODE HIT!
                <Sparkles className="inline w-4 h-4 ml-2" />
              </motion.div>
            )}

            <div className="p-8 text-center space-y-6">
              {/* Result Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                className="flex justify-center"
              >
                {result.won ? (
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <Trophy className="w-12 h-12 text-white" />
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center shadow-lg">
                    <TrendingDown className="w-12 h-12 text-white" />
                  </div>
                )}
              </motion.div>

              {/* Result Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <h2 className={`text-4xl font-bold ${result.won ? 'text-green-600' : 'text-gray-600'}`}>
                  {result.won ? 'YOU WON!' : 'Better Luck Next Time!'}
                </h2>
                <p className="text-gray-500">
                  Round #{result.roundId} • {result.game === 'ore' ? 'Blockpad' : 'Pachinko'}
                </p>
              </motion.div>

              {/* Winnings */}
              {result.won && result.winnings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="py-4"
                >
                  <p className="text-5xl font-bold text-green-600">
                    +{result.winnings.toFixed(4)}
                    <span className="text-2xl ml-2">SOL</span>
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Credited to your unified wallet
                  </p>
                </motion.div>
              )}

              {/* Tile Info */}
              {result.winningTile !== undefined && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center gap-6 text-sm"
                >
                  <div className="text-center">
                    <p className="text-gray-500">Winning Tile</p>
                    <p className="text-2xl font-bold text-green-600">#{(result.winningTile ?? 0) + 1}</p>
                  </div>
                  {result.playerTile !== undefined && !result.won && (
                    <div className="text-center">
                      <p className="text-gray-500">Your Tile</p>
                      <p className="text-2xl font-bold text-gray-600">#{result.playerTile + 1}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Action Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={onClose}
                  className={`w-full py-3 text-lg font-semibold ${
                    result.won
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-500 hover:bg-gray-600 text-white'
                  }`}
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  {result.won ? 'Play Again!' : 'Try Again'}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
