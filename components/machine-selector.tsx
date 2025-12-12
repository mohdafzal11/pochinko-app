'use client';

/**
 * Machine Selector Component
 * Allows users to select which Pachinko machine (token type) to play
 * Each machine accepts a different token (SOL, USDC, BONK, etc.)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Coins, Pause, Sparkles } from 'lucide-react';

export interface MachineInfo {
  id: string;
  name: string;
  programId: string;
  machineAddress: string;
  paymentMint: string;
  tokenSymbol: string;
  tokenDecimals: number;
  baseBallPrice: number;
  isActive: boolean;
  isPaused: boolean;
  roundDuration: number;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    icon: string;
  };
  stats?: {
    totalRounds: number;
    totalBallsSold: number;
    participantCount: number;
    activeRound: number | null;
  };
}

interface MachineSelectorProps {
  machines: MachineInfo[];
  selectedMachine: string;
  onSelectMachine: (machineId: string) => void;
  compact?: boolean;
  disabled?: boolean;
}

export default function MachineSelector({
  machines,
  selectedMachine,
  onSelectMachine,
  compact = false,
  disabled = false,
}: MachineSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentMachine = machines.find(m => m.id === selectedMachine) || machines[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.machine-selector')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (!currentMachine) {
    return (
      <div className="text-gray-400 text-sm">No machines available</div>
    );
  }

  const activeMachines = machines.filter(m => m.isActive && !m.isPaused);

  if (compact) {
    return (
      <div className="machine-selector relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-[#1A1A2E]/80 border border-[#E0CCA9]/20
            hover:border-[#E0CCA9]/40 transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          style={{ 
            borderColor: currentMachine.theme.primaryColor + '40',
          }}
        >
          <span className="text-lg">{currentMachine.theme.icon}</span>
          <span className="text-[#E0CCA9] font-bold">{currentMachine.tokenSymbol}</span>
          <ChevronDown className={`w-4 h-4 text-[#E0CCA9]/60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 mt-2 w-48 bg-[#1A1A2E] border border-[#E0CCA9]/20 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {machines.map((machine) => (
                <button
                  key={machine.id}
                  onClick={() => {
                    if (!machine.isPaused && machine.isActive) {
                      onSelectMachine(machine.id);
                      setIsOpen(false);
                    }
                  }}
                  disabled={machine.isPaused || !machine.isActive}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left
                    transition-all
                    ${machine.id === selectedMachine 
                      ? 'bg-[#E0CCA9]/20' 
                      : 'hover:bg-[#E0CCA9]/10'
                    }
                    ${machine.isPaused || !machine.isActive 
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                    }
                  `}
                >
                  <span className="text-xl">{machine.theme.icon}</span>
                  <div className="flex-1">
                    <div className="text-[#E0CCA9] font-bold">{machine.tokenSymbol}</div>
                    <div className="text-[#E0CCA9]/60 text-xs">{machine.name}</div>
                  </div>
                  {machine.id === selectedMachine && (
                    <Check className="w-4 h-4 text-green-400" />
                  )}
                  {machine.isPaused && (
                    <Pause className="w-4 h-4 text-yellow-400" />
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full-size selector (card grid)
  return (
    <div className="machine-selector">
      <h3 className="text-[#E0CCA9] font-bold text-lg mb-4 flex items-center gap-2">
        <Coins className="w-5 h-5" />
        Select Machine
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {machines.map((machine) => {
          const isSelected = machine.id === selectedMachine;
          const isDisabled = machine.isPaused || !machine.isActive || disabled;

          return (
            <motion.button
              key={machine.id}
              onClick={() => !isDisabled && onSelectMachine(machine.id)}
              disabled={isDisabled}
              whileHover={!isDisabled ? { scale: 1.02 } : undefined}
              whileTap={!isDisabled ? { scale: 0.98 } : undefined}
              className={`
                relative p-4 rounded-xl border-2 transition-all
                ${isSelected 
                  ? 'border-2' 
                  : 'border-[#E0CCA9]/20 hover:border-[#E0CCA9]/40'
                }
                ${isDisabled 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer'
                }
                bg-gradient-to-br from-[#1A1A2E] to-[#0D0D1A]
              `}
              style={{
                borderColor: isSelected ? machine.theme.primaryColor : undefined,
                boxShadow: isSelected 
                  ? `0 0 20px ${machine.theme.primaryColor}40` 
                  : undefined,
              }}
            >
              {/* Selected indicator */}
              {isSelected && (
                <div 
                  className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: machine.theme.primaryColor }}
                >
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Paused indicator */}
              {machine.isPaused && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Pause className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Machine icon */}
              <div 
                className="text-4xl mb-3 text-center"
                style={{ color: machine.theme.primaryColor }}
              >
                {machine.theme.icon}
              </div>

              {/* Machine name */}
              <div className="text-center">
                <div className="text-[#E0CCA9] font-bold text-lg">
                  {machine.tokenSymbol}
                </div>
                <div className="text-[#E0CCA9]/60 text-sm">
                  {machine.name}
                </div>
              </div>

              {/* Ball price */}
              <div className="mt-3 text-center">
                <div className="text-[#E0CCA9]/80 text-xs">Ball Price</div>
                <div className="text-[#E0CCA9] font-mono">
                  {(machine.baseBallPrice / Math.pow(10, machine.tokenDecimals)).toFixed(
                    machine.tokenDecimals > 6 ? 4 : 2
                  )} {machine.tokenSymbol}
                </div>
              </div>

              {/* Stats */}
              {machine.stats && (
                <div className="mt-3 pt-3 border-t border-[#E0CCA9]/10 flex justify-between text-xs">
                  <div className="text-center">
                    <div className="text-[#E0CCA9]/60">Round</div>
                    <div className="text-[#E0CCA9]">
                      #{machine.stats.activeRound || '-'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[#E0CCA9]/60">Players</div>
                    <div className="text-[#E0CCA9]">
                      {machine.stats.participantCount}
                    </div>
                  </div>
                </div>
              )}

              {/* Active indicator */}
              {machine.isActive && !machine.isPaused && (
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-green-400 animate-pulse" />
                  <span className="text-green-400 text-xs">Live</span>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {activeMachines.length === 0 && (
        <div className="text-center text-[#E0CCA9]/60 py-8">
          No active machines available
        </div>
      )}
    </div>
  );
}

/**
 * Hook to fetch machines from the server
 */
export function useMachines() {
  const [machines, setMachines] = useState<MachineInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMachines = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3920';
        const response = await fetch(`${API_URL}/lottery/machines`);
        if (!response.ok) throw new Error('Failed to fetch machines');
        const data = await response.json();
        setMachines(data.machines || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching machines:', err);
        setError(err.message);
        // Fallback to default SOL machine
        setMachines([{
          id: 'sol',
          name: 'SOL Pachinko',
          programId: '',
          machineAddress: '',
          paymentMint: '11111111111111111111111111111111',
          tokenSymbol: 'SOL',
          tokenDecimals: 9,
          baseBallPrice: 10_000_000,
          isActive: true,
          isPaused: false,
          roundDuration: 120,
          theme: {
            primaryColor: '#9945FF',
            secondaryColor: '#14F195',
            icon: '◎',
          },
        }]);
      } finally {
        setLoading(false);
      }
    };

    fetchMachines();
  }, []);

  return { machines, loading, error };
}
