import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from './use-toast';
import BN from "bn.js";

const API_URL = process.env.NEXT_API_URL || 'http://localhost:3920';
const UNIFIED_WALLET_PROGRAM_ID = new PublicKey(
  process.env.VITE_UNIFIED_WALLET_PROGRAM_ID || '9LkwNkyFM2D4gvjBCRxqiZ8PgxeMvTBgUSMwpyvDC42V'
);

const DISCRIMINATORS = {
  initialize: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]),
  deposit: new Uint8Array([242, 35, 198, 137, 82, 225, 242, 182]),
  withdraw: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34]),
};

function getDiscriminator(name: keyof typeof DISCRIMINATORS): Buffer {
  return Buffer.from(DISCRIMINATORS[name]);
}

// PDAs
function getPlayerAccountPDA(playerPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('unified_player'), playerPubkey.toBuffer()],
    UNIFIED_WALLET_PROGRAM_ID
  );
  return pda;
}

function getVaultPDA(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('unified_vault')],
    UNIFIED_WALLET_PROGRAM_ID
  );
  return pda;
}

interface UnifiedWalletAccount {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  oreGameStats?: {
    roundsPlayed: number;
    totalWagered: number;
    roundsWon: number;
  };
  lotteryStats?: {
    ballsPurchased: number;
    roundsParticipated: number;
    prizesWon: number;
  };
}

export function useUnifiedWallet() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [balance, setBalance] = useState<number>(0);
  const [account, setAccount] = useState<UnifiedWalletAccount | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [configExists, setConfigExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch config
  const checkConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/wallet/config-status`);
      if (response.ok) {
        const data = await response.json();
        setConfigExists(data.exists || false);
      }
    } catch {
      setConfigExists(false);
    }
  }, []);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`${API_URL}/wallet/balance/${publicKey.toBase58()}`);
      const data = await response.json();
      setBalance(data.balance || 0);
      setAccountExists(data.accountExists || false);
    } catch {
      setBalance(0);
      setAccountExists(false);
    }
  }, [publicKey]);

  // Fetch full account
  const fetchAccount = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`${API_URL}/wallet/account/${publicKey.toBase58()}`);
      const data = await response.json();
      setAccount(data);
      setBalance(data.balance || 0);
    } catch {}
  }, [publicKey]);

  function encodeU64LE(value: bigint): Buffer {
    const bn = new BN(value.toString());
    return bn.toArrayLike(Buffer, "le", 8);
  }

  const initialize = useCallback(async (referrer?: PublicKey) => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        type: "error"
      });
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const playerAccountPDA = getPlayerAccountPDA(publicKey);

      const discriminator = getDiscriminator('initialize');
      const referrerData = referrer
        ? Buffer.concat([Buffer.from([1]), referrer.toBuffer()])
        : Buffer.from([0]);

      const instructionData = Buffer.concat([discriminator, referrerData]);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: playerAccountPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: UNIFIED_WALLET_PROGRAM_ID,
        data: instructionData,
      });

      const tx = new Transaction().add(instruction);
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = publicKey;

      toast({
        title: "Please sign the transaction",
        description: "Initializing your wallet..."
      });

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setAccountExists(true);
      await fetchBalance();

      toast({
        title: "Wallet initialized!",
        description: "You can now deposit funds."
      });

      return true;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Initialization failed",
        description: err.message,
        type: "error"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, fetchBalance]);

  const deposit = useCallback(async (amount: number) => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        type: "error"
      });
      return false;
    }

    if (!accountExists) {
      const initialized = await initialize();
      if (!initialized) return false;
    }

    setLoading(true);
    setError(null);

    try {
      const playerAccountPDA = getPlayerAccountPDA(publicKey);
      const vaultPDA = getVaultPDA();
      const amountLamports = BigInt(amount * LAMPORTS_PER_SOL);

      const discriminator = getDiscriminator('deposit');
      const amountBuffer = encodeU64LE(amountLamports);

      const instructionData = Buffer.concat([discriminator, amountBuffer]);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: playerAccountPDA, isSigner: false, isWritable: true },
          { pubkey: vaultPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: UNIFIED_WALLET_PROGRAM_ID,
        data: instructionData,
      });

      const tx = new Transaction().add(instruction);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      toast({
        title: "Please sign the transaction",
        description: `Depositing ${amount} SOL...`
      });

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      await fetchBalance();

      toast({
        title: "Deposit successful!",
        description: `${amount} SOL added to your wallet.`
      });

      return true;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Deposit failed",
        description: err.message,
        type: "error"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, accountExists, initialize, fetchBalance]);

  // Withdraw
  const withdraw = useCallback(async (amount: number) => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        type: "error"
      });
      return false;
    }

    if (amount > balance) {
      toast({
        title: "Insufficient balance",
        description: `You only have ${balance.toFixed(4)} SOL`,
        type: "error"
      });
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const playerAccountPDA = getPlayerAccountPDA(publicKey);
      const vaultPDA = getVaultPDA();
      const amountLamports = BigInt(amount * LAMPORTS_PER_SOL);

      const discriminator = getDiscriminator('withdraw');
      const amountBuffer = encodeU64LE(amountLamports);

      const instructionData = Buffer.concat([discriminator, amountBuffer]);

      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: playerAccountPDA, isSigner: false, isWritable: true },
          { pubkey: vaultPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: UNIFIED_WALLET_PROGRAM_ID,
        data: instructionData,
      });

      const tx = new Transaction().add(instruction);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      toast({
        title: "Please sign the transaction",
        description: `Withdrawing ${amount} SOL...`
      });

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      await fetchBalance();

      toast({
        title: "Withdrawal successful!",
        description: `${amount} SOL withdrawn to your wallet.`
      });

      return true;
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Withdrawal failed",
        description: err.message,
        type: "error"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, balance, fetchBalance]);

  // Auto-fetch
  useEffect(() => {
    checkConfig();
    if (publicKey) {
      fetchBalance();
      fetchAccount();
    } else {
      setBalance(0);
      setAccount(null);
      setAccountExists(false);
    }
  }, [publicKey, fetchBalance, fetchAccount, checkConfig]);

  return {
    balance,
    account,
    accountExists,
    configExists,
    loading,
    error,
    initialize,
    deposit,
    withdraw,
    fetchBalance,
    fetchAccount,
  };
}
