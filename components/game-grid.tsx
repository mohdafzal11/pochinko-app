import { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { Tile } from '@/types/game';
import { motion, AnimatePresence } from 'framer-motion';

interface GameGridProps {
    tiles: Tile[];
    selectedTiles: number[];
    onTileToggle: (tile: number) => void;
    disabled?: boolean;
}

const GameGrid = ({ tiles, selectedTiles, onTileToggle, disabled = false }: GameGridProps) => {
    const [hoveredTile, setHoveredTile] = useState<number | null>(null);

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
            className="relative bg-[#EE342C] w-full max-w-xl mx-auto rounded-[40px] shadow-2xl overflow-hidden
                h-[580px] md:min-h-[650px] border-8 border-black/10"
        >
            {/* Top Bar - Pulsing Neon */}
            <motion.div
                animate={{ boxShadow: ["0 0 20px #000", "0 0 40px #000", "0 0 20px #000"] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="m-4 h-16 bg-black rounded-2xl shadow-inner border-4 border-[#E0CCA9]"
            />

            {/* 5×5 Animated Grid */}
            <div className="grid grid-cols-5 grid-rows-5 gap-2 sm:gap-4 px-4 sm:px-6 py-4">
                {tiles.map((tile, index) => {
                    const isSelected = selectedTiles.includes(tile.id);
                    const isHovered = hoveredTile === tile.id;
                    const hasBets = tile.bets > 0;

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
                            whileHover={!disabled ? { scale: 1.18, y: -10 } : {}}
                            whileTap={!disabled ? { scale: 0.95 } : {}}
                            onClick={() => !disabled && onTileToggle(tile.id)}
                            onMouseEnter={() => !disabled && setHoveredTile(tile.id)}
                            onMouseLeave={() => setHoveredTile(null)}
                            disabled={disabled}
                            className={`relative rounded-xl shadow-xl overflow-hidden transition-all duration-300
                ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                ${isSelected ? 'ring-4 ring-[#fef08a] ring-offset-4 ring-offset-[#c41e3a]' : ''}
              `}
                        >
                            {/* Base Tile */}
                            <motion.div
                                animate={{
                                    backgroundColor: isSelected
                                        ? "#fde68a"
                                        : isHovered && !disabled
                                            ? "#fde68a"
                                            : "#fef3c7",
                                }}
                                className="absolute inset-0"
                            />

                            {/* Selected Pulse Glow */}
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

                            {/* Content */}
                            <div className="relative h-full flex flex-col items-center justify-center p-3">
                                <motion.span
                                    animate={{ scale: isSelected ? [1, 1.2, 1] : 1 }}
                                    transition={{ duration: 0.6, repeat: isSelected ? Infinity : 0 }}
                                    className="text-2xl sm:text-3xl font-black text-[#c41e3a] drop-shadow-lg"
                                >
                                    {tile.position}
                                </motion.span>

                                {/* Bets Counter with Sparkles */}
                                <AnimatePresence>
                                    {hasBets && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="mt-1 flex flex-col items-center"
                                        >
                                            <div className="flex items-center gap-1">
                                                <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                                                <motion.span
                                                    key={tile.bets}
                                                    initial={{ scale: 1.5, color: "#fef08a" }}
                                                    animate={{ scale: 1, color: "#c41e3a" }}
                                                    className="text-sm font-bold"
                                                >
                                                    {tile.bets}
                                                </motion.span>
                                            </div>
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 0.7 }}
                                                className="text-[10px] text-[#c41e3a] font-medium"
                                            >
                                                {tile.volume.toFixed(2)} SOL
                                            </motion.span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.button>
                    );
                })}
            </div>

            {/* Bottom Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-between px-6 pb-6"
            >
                <div>
                    <motion.p
                        animate={{
                            textShadow: ["0 0 10px #fef08a", "0 0 30px #fef08a", "0 0 10px #fef08a"]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="text-2xl sm:text-4xl text-[#fef08a] font-black tracking-[0.2em] drop-shadow-2xl"
                    >
                        ブロックパッド
                    </motion.p>
                    <motion.p
                        initial={{ x: -50 }}
                        animate={{ x: 0 }}
                        className="text-3xl	sm:text-5xl text-[#fef08a] font-black tracking-wider drop-shadow-2xl"
                    >
                        BLOCKPAD
                    </motion.p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3].map((i) => (
                        <motion.button
                            key={i}
                            whileHover={{ scale: 1.1, rotate: i === 2 ? 5 : -5 }}
                            whileTap={{ scale: 0.95 }}
                            className="bg-[#fef3c7] p-4 rounded-xl shadow-xl hover:bg-[#fde68a] transition-all"
                        >
                            <Zap className="w-6 h-6 mx-auto text-[#c41e3a]" />
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Subtle Breathing Background */}
            <motion.div
                animate={{
                    background: [
                        "radial-gradient(circle at 50% 50%, #c41e3a 0%, #991b1b 100%)",
                        "radial-gradient(circle at 30% 70%, #e11d48 0%, #991b1b 100%)",
                        "radial-gradient(circle at 70% 30%, #dc2626 0%, #991b1b 100%)",
                        "radial-gradient(circle at 50% 50%, #c41e3a 0%, #991b1b 100%)",
                    ],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 -z-10"
            />
        </motion.div>
    );
};

export default GameGrid;