import { useState, useEffect, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from './use-toast';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_API_URL ||
  'http://localhost:3920';
const UNIFIED_WALLET_PROGRAM_ID = new PublicKey(
  process.env.VITE_UNIFIED_WALLET_PROGRAM_ID || '9LkwNkyFM2D4gvjBCRxqiZ8PgxeMvTBgUSMwpyvDC42V'
);

// Pre-computed Anchor instruction discriminators (first 8 bytes of sha256("global:<name>"))
// These are constant for a given instruction name
const DISCRIMINATORS = {
  initialize: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]),
  deposit: new Uint8Array([242, 35, 198, 137, 82, 225, 242, 182]),
  withdraw: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34]),
};

function getDiscriminator(name: keyof typeof DISCRIMINATORS): Buffer {
  return Buffer.from(DISCRIMINATORS[name]);
}

// Encode a bigint as a u64 little-endian byte array (browser-safe)
function bigIntToU64LEBytes(value: bigint): Uint8Array {
  // 1. Create a buffer of 8 bytes
  const buffer = new ArrayBuffer(8);
  
  // 2. Use DataView to write the BigUint64
  // The 'true' argument enables Little-Endian
  new DataView(buffer).setBigUint64(0, value, true);
  
  // 3. Return the view as a Uint8Array
  return new Uint8Array(buffer);
}

// Derive player account PDA
function getPlayerAccountPDA(playerPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('unified_player'), playerPubkey.toBuffer()],
    UNIFIED_WALLET_PROGRAM_ID
  );
  return pda;
}

// Derive vault PDA
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
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [account, setAccount] = useState<UnifiedWalletAccount | null>(null);
  const [accountExists, setAccountExists] = useState(false);
  const [configExists, setConfigExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if config exists
  const checkConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/wallet/config-status`);
      if (response.ok) {
        const data = await response.json();
        setConfigExists(data.exists || false);
      }
    } catch (err: any) {
      console.error('Error checking config:', err);
      setConfigExists(false);
    }
  }, []);

  // Fetch balance
  const fetchBalance = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`${API_URL}/wallet/balance/${publicKey.toBase58()}`);
      if (!response.ok) throw new Error('Failed to fetch balance');
      
      const data = await response.json();
      setBalance(data.balance || 0);
      setTokenBalance(data.tokenBalance || 0);
      setAccountExists(data.accountExists || false);
    } catch (err: any) {
      console.error('Error fetching unified wallet balance:', err);
      setBalance(0);
      setTokenBalance(0);
      setAccountExists(false);
    }
  }, [publicKey]);

  // Fetch full account
  const fetchAccount = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const response = await fetch(`${API_URL}/wallet/account/${publicKey.toBase58()}`);
      if (!response.ok) throw new Error('Failed to fetch account');
      
      const data = await response.json();
      setAccount(data);
      setBalance(data.balance || 0);
      setTokenBalance(data.tokenBalance || 0);
    } catch (err: any) {
      console.error('Error fetching unified wallet account:', err);
    }
  }, [publicKey]);

  // Initialize account (client-side transaction building)
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
      
      // Build instruction data: discriminator + Option<Pubkey>
      const discriminator = getDiscriminator('initialize');
      let referrerData: Uint8Array;
      if (referrer) {
        referrerData = new Uint8Array([1, ...referrer.toBytes()]);
      } else {
        referrerData = new Uint8Array([0]);
      }
      const instructionData = Buffer.concat([discriminator, Buffer.from(referrerData)]);

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
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      
      console.log('Initialize transaction:', {
        playerAccountPDA: playerAccountPDA.toBase58(),
        player: publicKey.toBase58(),
        programId: UNIFIED_WALLET_PROGRAM_ID.toBase58(),
      });
      
      toast({
        title: "Please sign the transaction",
        description: "Initializing your unified wallet..."
      });

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast({
        title: "Wallet initialized!",
        description: "You can now deposit funds"
      });

      setAccountExists(true);
      await fetchBalance();
      
      return true;
    } catch (err: any) {
      console.error('Error initializing unified wallet:', err);
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

  // Deposit (client-side transaction building)
  const deposit = useCallback(async (amount: number) => {
    if (!publicKey || !sendTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        type: "error"
      });
      return false;
    }

    // Initialize if needed
    if (!accountExists) {
      const initialized = await initialize();
      if (!initialized) return false;
    }

    setLoading(true);
    setError(null);

    try {
      const playerAccountPDA = getPlayerAccountPDA(publicKey);
      const vaultPDA = getVaultPDA();
      const amountLamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
      
      // Build instruction data: discriminator + amount (u64 LE)
      const discriminator = getDiscriminator('deposit');
      const amountBytes = bigIntToU64LEBytes(amountLamports);
      const instructionData = Buffer.concat([
        discriminator,
        Buffer.from(amountBytes),
      ]);

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
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      
      console.log('Deposit transaction:', {
        playerAccountPDA: playerAccountPDA.toBase58(),
        vaultPDA: vaultPDA.toBase58(),
        amount: amountLamports.toString(),
        programId: UNIFIED_WALLET_PROGRAM_ID.toBase58(),
      });
      
      toast({
        title: "Please sign the transaction",
        description: `Depositing ${amount} SOL...`
      });

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast({
        title: "Deposit successful!",
        description: `${amount} SOL added to your unified wallet`
      });

      await fetchBalance();
      
      return true;
    } catch (err: any) {
      console.error('Error depositing to unified wallet:', err);
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

  // Withdraw (client-side transaction building)
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
      const amountLamports = BigInt(Math.floor(amount * LAMPORTS_PER_SOL));
      
      // Build instruction data: discriminator + amount (u64 LE)
      const discriminator = getDiscriminator('withdraw');
      const amountBytes = bigIntToU64LEBytes(amountLamports);
      const instructionData = Buffer.concat([
        discriminator,
        Buffer.from(amountBytes),
      ]);

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
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = publicKey;
      
      toast({
        title: "Please sign the transaction",
        description: `Withdrawing ${amount} SOL...`
      });

      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      toast({
        title: "Withdrawal successful!",
        description: `${amount} SOL withdrawn to your wallet`
      });

      await fetchBalance();
      
      return true;
    } catch (err: any) {
      console.error('Error withdrawing from unified wallet:', err);
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

  // Auto-fetch balance when wallet connects
  useEffect(() => {
    checkConfig();
    if (publicKey) {
      fetchBalance();
      // Fetch full account for stats
      fetchAccount();
    } else {
      setBalance(0);
      setAccount(null);
      setAccountExists(false);
    }
  }, [publicKey, fetchBalance, fetchAccount, checkConfig]);

  return {
    balance,
    tokenBalance,
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
