import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  Ed25519Program,
  SYSVAR_INSTRUCTIONS_PUBKEY
} from '@solana/web3.js';
import bs58 from 'bs58';
import { authFetch } from '@/lib/auth';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_API_URL ||
  'http://localhost:3920';

export interface MarketplaceListing {
  id: string;
  machineId: string;
  roundNumber: number;
  ballId: number;
  sellerWallet: string;
  price: number;
  priceToken: string;
  status: 'active' | 'sold' | 'cancelled';
  buyerWallet?: string;
  txSignature?: string;
  listedAt: number;
  soldAt?: number;
}

export interface PlayerBall {
  ballId: number;
  listedForSale: boolean;
  listingId?: string;
}

export interface PlayerInventory {
  walletAddress: string;
  machineId: string;
  roundNumber: number;
  balls: PlayerBall[];
  lastUpdated: number;
}

export interface MarketplaceStats {
  activeListings: number;
  totalVolume: number;
  totalSales: number;
  avgPrice: number;
}

export function useMarketplace() {
  const { publicKey, signTransaction } = useWallet();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [inventory, setInventory] = useState<PlayerInventory[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch active marketplace listings
  const fetchListings = useCallback(async (machineId?: string, roundNumber?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (machineId) params.append('machineId', machineId);
      if (roundNumber) params.append('roundNumber', roundNumber.toString());
      
      const response = await fetch(`${API_URL}/marketplace/listings?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setListings(data.listings || []);
      } else {
        setError(data.error || 'Failed to fetch listings');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch player's inventory
  const fetchInventory = useCallback(async (machineId?: string, roundNumber?: number) => {
    if (!publicKey) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (machineId) params.append('machineId', machineId);
      if (roundNumber) params.append('roundNumber', roundNumber.toString());
      
      const response = await fetch(`${API_URL}/inventory/${publicKey.toString()}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setInventory(data.inventory || []);
        setMyListings(data.activeListings || []);
      } else {
        setError(data.error || 'Failed to fetch inventory');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Fetch marketplace stats
  const fetchStats = useCallback(async (machineId?: string) => {
    try {
      const params = machineId ? `?machineId=${machineId}` : '';
      const response = await fetch(`${API_URL}/marketplace/stats${params}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // List a ball for sale
  const listBall = useCallback(async (
    machineId: string,
    roundNumber: number,
    ballId: number,
    priceInSol: number
  ): Promise<{ success: boolean; listing?: MarketplaceListing; message: string }> => {
    if (!publicKey) {
      return { success: false, message: 'Wallet not connected' };
    }

    try {
      const response = await authFetch('/marketplace/list', {
        method: 'POST',
        body: JSON.stringify({
          sellerWallet: publicKey.toString(),
          machineId,
          roundNumber,
          ballId,
          price: priceInSol,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh inventory
        await fetchInventory(machineId, roundNumber);
        await fetchListings(machineId, roundNumber);
      }
      
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [publicKey, fetchInventory, fetchListings]);

  // Delist a ball (cancel listing)
  const delistBall = useCallback(async (
    listingId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!publicKey) {
      return { success: false, message: 'Wallet not connected' };
    }

    try {
      const response = await authFetch('/marketplace/delist', {
        method: 'POST',
        body: JSON.stringify({
          sellerWallet: publicKey.toString(),
          listingId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh data
        await fetchInventory();
        await fetchListings();
      }
      
      return data;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [publicKey, fetchInventory, fetchListings]);

  // Buy a ball from marketplace (client-signed on-chain transaction)
  const buyBall = useCallback(async (
    listingId: string
  ): Promise<{ success: boolean; txSignature?: string; message: string }> => {
    if (!publicKey || !signTransaction) {
      return { success: false, message: 'Wallet not connected' };
    }

    try {
      // Step 1: Get authorization from server
      const authResponse = await authFetch('/marketplace/authorize-buy', {
        method: 'POST',
        body: JSON.stringify({
          buyerWallet: publicKey.toString(),
          listingId,
        }),
      });

      const authData = await authResponse.json();
      
      console.log('[Marketplace] Authorization response:', authData);
      
      if (!authData.success) {
        return { success: false, message: authData.error || 'Failed to get authorization' };
      }

      const { authorization, listing, machineAddress, programId: serverProgramId, authorityPublicKey } = authData;
      console.log('[Marketplace] Received authorityPublicKey:', authorityPublicKey);

      // Step 2: Build on-chain transaction
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
      const programId = new PublicKey(serverProgramId || '2SyVdy5osy3LsUMZauMkfKb1zY6gigXRQhjS73LBh8aS');
      const unifiedWalletProgramId = new PublicKey(process.env.NEXT_PUBLIC_UNIFIED_WALLET_PROGRAM_ID || '9LkwNkyFM2D4gvjBCRxqiZ8PgxeMvTBgUSMwpyvDC42V');

      // Use machine address and authority from server (actual on-chain account)
      const sellerPubkey = new PublicKey(listing.sellerWallet);
      const machinePDA = new PublicKey(machineAddress);
      const authorityPubkey = new PublicKey(authorityPublicKey || '95cy97Fbh3ohteFppEv3BJF1tsWx5sViqigc1BaxtLZe');
      
      const [roundPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round'), machinePDA.toBuffer(), Buffer.from(new Uint8Array(new BigUint64Array([BigInt(listing.roundNumber)]).buffer))],
        programId
      );

      const [buyerUnifiedPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('unified_player'), publicKey.toBuffer()],
        unifiedWalletProgramId
      );

      const [sellerUnifiedPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('unified_player'), sellerPubkey.toBuffer()],
        unifiedWalletProgramId
      );

      const [treasuryUnifiedPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('unified_player'), authorityPubkey.toBuffer()],
        unifiedWalletProgramId
      );

      const [unifiedConfigPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        unifiedWalletProgramId
      );

      // Calculate correct shard for ball ID
      // MAX_BALLS_PER_SHARD = 5_000_000 (from on-chain program)
      const MAX_BALLS_PER_SHARD = 5_000_000;
      const shardIndex = Math.floor(listing.ballId / MAX_BALLS_PER_SHARD);
      
      console.log('[Marketplace] Shard calculation:', {
        ballId: listing.ballId,
        maxBallsPerShard: MAX_BALLS_PER_SHARD,
        shardIndex
      });
      
      // Shard PDA
      const shardIndexBytes = new Uint8Array(new Uint16Array([shardIndex]).buffer);
      const [shardPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('round_shard'), roundPDA.toBuffer(), shardIndexBytes],
        programId
      );
      
      console.log('[Marketplace] Shard PDA:', shardPDA.toBase58());

      // Step 3: Create Ed25519 signature verification instruction
      // TEMPORARILY DISABLED FOR DEMO - verification disabled on-chain
      /* 
      const authSignature = bs58.decode(authorization.authorization);
      const authMessage = Buffer.from(authorization.message, 'utf8');

      console.log('[Marketplace] Ed25519 verification details:');
      console.log('  Authority pubkey:', authorityPubkey.toBase58());
      console.log('  Message:', authorization.message);
      console.log('  Message length:', authMessage.length);
      console.log('  Signature length:', authSignature.length);

      const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
        publicKey: authorityPubkey.toBytes(),
        message: authMessage,
        signature: authSignature,
      });
      
      console.log('[Marketplace] Ed25519 instruction data length:', ed25519Instruction.data.length);
      console.log('[Marketplace] Ed25519 instruction data (hex):', ed25519Instruction.data.toString('hex'));
      
      // Extract what the Ed25519 instruction contains
      const ed25519Pubkey = ed25519Instruction.data.slice(14, 46);
      const ed25519Sig = ed25519Instruction.data.slice(46, 110);
      const ed25519Msg = ed25519Instruction.data.slice(110);
      
      console.log('[Marketplace] Ed25519 pubkey (hex):', ed25519Pubkey.toString('hex'));
      console.log('[Marketplace] Ed25519 pubkey (base58):', bs58.encode(ed25519Pubkey));
      console.log('[Marketplace] Ed25519 message (string):', ed25519Msg.toString('utf8'));
      console.log('[Marketplace] Ed25519 message matches auth message:', ed25519Msg.toString('utf8') === authorization.message);
      */

      // Step 4: Create marketplace transfer instruction
      const nonceBytes = Buffer.from(authorization.nonce, 'hex');
      
      // Build instruction data: discriminator + ball_id + price + nonce + timestamp
      // Discriminator for transfer_ball_marketplace from IDL
      const discriminator = Buffer.from([252, 208, 144, 137, 243, 94, 156, 170]);
      
      const ballIdByte = Buffer.from([listing.ballId]);
      
      // Price as u64 (little-endian) - browser compatible
      const priceBuffer = new ArrayBuffer(8);
      const priceView = new DataView(priceBuffer);
      priceView.setBigUint64(0, BigInt(listing.price), true); // true = little-endian
      const priceBytes = Buffer.from(priceBuffer);
      
      // Timestamp as i64 (little-endian) - browser compatible
      const timestampBuffer = new ArrayBuffer(8);
      const timestampView = new DataView(timestampBuffer);
      timestampView.setBigInt64(0, BigInt(authorization.timestamp), true); // true = little-endian
      const timestampBytes = Buffer.from(timestampBuffer);
      
      const data = Buffer.concat([discriminator, ballIdByte, priceBytes, nonceBytes, timestampBytes]);
      
      console.log('[Marketplace] Instruction data:', {
        discriminator: discriminator.toString('hex'),
        ballId: listing.ballId,
        price: listing.price,
        nonce: authorization.nonce,
        timestamp: authorization.timestamp,
        totalLength: data.length,
        expectedLength: 41,
        dataHex: data.toString('hex'),
        breakdown: {
          discriminatorLength: discriminator.length,
          ballIdLength: ballIdByte.length,
          priceLength: priceBytes.length,
          nonceLength: nonceBytes.length,
          timestampLength: timestampBytes.length
        }
      });

      const marketplaceInstruction = new TransactionInstruction({
        keys: [
          { pubkey: machinePDA, isSigner: false, isWritable: true },
          { pubkey: roundPDA, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: sellerPubkey, isSigner: false, isWritable: false },
          { pubkey: authorityPubkey, isSigner: false, isWritable: false }, // treasury authority
          { pubkey: unifiedWalletProgramId, isSigner: false, isWritable: false },
          { pubkey: buyerUnifiedPDA, isSigner: false, isWritable: true },
          { pubkey: sellerUnifiedPDA, isSigner: false, isWritable: true },
          { pubkey: treasuryUnifiedPDA, isSigner: false, isWritable: true },
          { pubkey: unifiedConfigPDA, isSigner: false, isWritable: false },
          { pubkey: programId, isSigner: false, isWritable: false }, // caller_program
          { pubkey: SYSVAR_INSTRUCTIONS_PUBKEY, isSigner: false, isWritable: false },
          { pubkey: shardPDA, isSigner: false, isWritable: true }, // Remaining account
        ],
        programId,
        data,
      });

      // Step 5: Build and sign transaction
      const transaction = new Transaction();
      // Ed25519 instruction disabled for demo
      // transaction.add(ed25519Instruction);
      transaction.add(marketplaceInstruction);
      
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = publicKey;

      const signedTx = await signTransaction(transaction);

      // Step 6: Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize());
      console.log('[Marketplace] Transaction sent:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('[Marketplace] Transaction confirmed:', signature);

      // Step 7: Confirm with server to update database
      const confirmResponse = await authFetch('/marketplace/confirm-buy', {
        method: 'POST',
        body: JSON.stringify({
          buyerWallet: publicKey.toString(),
          listingId,
          txSignature: signature,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (confirmData.success) {
        // Refresh data
        await fetchInventory();
        await fetchListings();
        await fetchStats();
      }

      return {
        success: true,
        txSignature: signature,
        message: 'Ball purchased successfully!',
      };
    } catch (err: any) {
      console.error('[Marketplace] Buy error:', err);
      return { success: false, message: err.message || 'Failed to purchase ball' };
    }
  }, [publicKey, signTransaction, fetchInventory, fetchListings, fetchStats]);

  // Get total balls count
  const totalBalls = inventory.reduce((sum, inv) => sum + inv.balls.length, 0);
  const listedBalls = inventory.reduce(
    (sum, inv) => sum + inv.balls.filter(b => b.listedForSale).length, 
    0
  );

  return {
    // State
    listings,
    inventory,
    myListings,
    stats,
    loading,
    error,
    totalBalls,
    listedBalls,
    
    // Actions
    fetchListings,
    fetchInventory,
    fetchStats,
    listBall,
    delistBall,
    buyBall,
  };
}

export default useMarketplace;
