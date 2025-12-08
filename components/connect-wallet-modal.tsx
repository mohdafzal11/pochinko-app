'use client';

import { motion, AnimatePresence } from "framer-motion";
import { X, Wallet } from "lucide-react";
import { Button } from '@/components/ui/button';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { toast } from 'sonner';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { setVisible } = useWalletModal();

  const handleConnectWallet = () => {
    try {
      setVisible(true);
      onClose();
    } catch (error) {
      toast.error('Failed to open wallet selection');
      console.error('Wallet connection error:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="text-center space-y-6">
              {/* Wallet Icon */}
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center"
                >
                  <Wallet className="w-10 h-10 text-blue-600" />
                </motion.div>
              </div>

              {/* Modal Content */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800">Connect Wallet</h2>
                <p className="text-gray-600">
                  Connect your wallet to start playing games
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleConnectWallet}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                >
                  Connect Wallet
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
