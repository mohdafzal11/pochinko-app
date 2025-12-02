import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

export const useSolanaWallet = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wallet.publicKey) {
      updateBalance();
    } else {
      setBalance(0);
    }
  }, [wallet.publicKey, connection]);

  const updateBalance = async () => {
    if (!wallet.publicKey) return;
    
    setLoading(true);
    try {
      const lamports = await connection.getBalance(wallet.publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return {
    ...wallet,
    balance,
    loading,
    updateBalance,
    formatAddress,
    isConnected: wallet.connected,
  };
};
