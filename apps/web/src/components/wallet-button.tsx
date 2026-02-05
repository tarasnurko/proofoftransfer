'use client'

import { useAppKit } from '@reown/appkit/react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'

export function WalletButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : ''

  return (
    <Button
      onClick={() => open()}
      size="sm"
      className="border-4 font-bold"
    >
      <Wallet className="mr-2 h-4 w-4" />
      {isConnected ? truncatedAddress : 'Connect Wallet'}
    </Button>
  )
}
