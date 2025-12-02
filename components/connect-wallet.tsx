import { useSolanaWallet } from '@/hooks/use-solana-wallet';
import { Wallet, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWalletModal } from "@solana/wallet-adapter-react-ui";


const ConnectWallet = () => {

  const { setVisible } = useWalletModal();
  const { publicKey, balance, formatAddress, disconnect, isConnected } = useSolanaWallet();

  if (!isConnected) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="bg-black text-white rounded-full h-[38px] px-5 hover:scale-105 hover:bg-gray-800 transition"
      >
        Connect Wallet
      </button>
    );

  }


  return (
    <div className="flex items-center gap-3">
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl flex items-center gap-3">
        <Wallet className="w-4 h-4" />
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground text-kode-monu">Balance</span>
          <span className="text-sm font-semibold text-kode-monu">{balance.toFixed(4)} SOL</span>
        </div>
      </div>


      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
        <span className="text-sm text-kode-monu text-muted-foreground">{publicKey && formatAddress(publicKey.toString())}</span>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={disconnect}
        className="bg-gray-100 dark:bg-gray-800 hover:bg-destructive/20 hover:border-destructive"
      >
        <LogOut className="w-4 h-4 hover:text-destructive" />
      </Button>
    </div>
  );
};


export default ConnectWallet;