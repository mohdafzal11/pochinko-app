'use client';

import { useState } from 'react'
import { useSolanaWallet } from '@/hooks/use-solana-wallet'
import { useUnifiedWallet } from '@/hooks/use-unified-wallet'
import { LogOut, Coins, Wallet, ChevronDown, ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const ConnectWallet = () => {
  const { setVisible } = useWalletModal()
  const { publicKey, balance: walletBalance, formatAddress, disconnect, isConnected } = useSolanaWallet()

  const {
    balance: unifiedBalance,
    account: unifiedAccount,
    accountExists,
    configExists,
    loading: unifiedLoading,
    deposit: unifiedDeposit,
    withdraw: unifiedWithdraw,
    fetchBalance: refreshUnifiedBalance,
  } = useUnifiedWallet();

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')


  const openDialog = (mode: 'deposit' | 'withdraw') => {
    setDialogMode(mode)
    setIsDialogOpen(true)
  }

  const handleAction = async () => {
    const value = parseFloat(amount)
    if (!value || value <= 0) return

    if (dialogMode === 'deposit') {
      await handleDeposit(value)
    } else {
      await handleWithdraw(value)
    }

    setAmount('')
    setIsDialogOpen(false)
  }

  const handleDeposit = async (depositAmount: number) => {
    if (!isConnected || !publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    if (depositAmount > walletBalance) {
      toast.error('Insufficient wallet balance')
      return
    }

    const success = await unifiedDeposit(depositAmount)
    if (success) {
      toast.success(`Deposited ${depositAmount} SOL to unified wallet`)
    }
  }

  const handleWithdraw = async (withdrawAmount: number) => {
    if (!isConnected || !publicKey) {
      toast.error('Please connect your wallet')
      return
    }

    if (withdrawAmount <= 0 || withdrawAmount > unifiedBalance) {
      toast.error('Invalid withdrawal amount')
      return
    }

    const success = await unifiedWithdraw(withdrawAmount)
    if (success) {
      toast.success(`Withdrawn ${withdrawAmount} SOL from unified wallet`)
    }
  }

  if (!isConnected) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setVisible(true)}
        className="bg-black text-white rounded-full min-h-[38px] px-5 hover:bg-gray-800 transition font-medium min-w-0"
      >
        Connect Wallet
      </motion.button>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <Coins className="w-5 h-5" />
              <span className="text-sm font-semibold text-kode-monu">
                {unifiedBalance.toFixed(4)} SOL
              </span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </motion.div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 p-4 space-y-4">
            {/* Game Balance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Coins className="w-6 h-6" />
                <div>
                  <p className="text-xs text-gray-500 text-kode-monu">Game Balance</p>
                  <p className="font-bold text-lg text-kode-monu">{unifiedBalance.toFixed(4)} SOL</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Wallet Balance */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="w-6 h-6" />
                <div>
                  <p className="text-xs text-gray-500 text-kode-monu">Wallet Balance</p>
                  <p className="font-bold text-lg text-kode-monu">{walletBalance.toFixed(4)} SOL</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            <div className="grid grid-cols-2 gap-3">
              <Button size="sm" onClick={() => openDialog('deposit')} className="bg-green-600 hover:bg-green-700 text-white">
                <ArrowDown className="w-4 h-4 mr-1" />
                Deposit
              </Button>
              <Button size="sm" onClick={() => openDialog('withdraw')} className='bg-red-600 hover:bg-red-700 text-white'>
                <ArrowUp className="w-4 h-4 mr-1" />
                Withdraw
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Address */}
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
          <span className="text-sm text-kode-mono text-muted-foreground">
            {publicKey && formatAddress(publicKey.toString())}
          </span>
        </div>

        {/* Disconnect */}
        <Button
          variant="outline"
          size="icon"
          onClick={disconnect}
          className="bg-gray-100 dark:bg-gray-800 hover:bg-destructive/20 hover:border-destructive rounded-xl"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Deposit / Withdraw Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl text-kode-monu">
              {dialogMode === 'deposit' ? 'Deposit to Game' : 'Withdraw to Wallet'}
            </DialogTitle>
            <DialogDescription className='text-kode-monu'>
              {dialogMode === 'deposit'
                ? 'Transfer SOL from your wallet to game balance'
                : 'Transfer SOL from game balance to your wallet'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className='text-kode-monu'>Amount (SOL)</Label>
              <Input
                type="number"
                placeholder="0.5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg text-kode-monu"
              />

            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 text-kode-monu">
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                className={dialogMode === 'deposit' ? 'text-kode-monu flex-1 bg-green-600 text-white' : 'text-kode-monu text-white flex-1 bg-red-600'}
              >
                {dialogMode === 'deposit' ? 'Deposit' : 'Withdraw'} {amount || '0'} SOL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ConnectWallet