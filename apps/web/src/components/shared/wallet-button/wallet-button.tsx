'use client'

import { useAppKit } from '@reown/appkit/react'
import { useConnection } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'
import { truncateAddress } from '@/utils/format.utils'

export function WalletButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useConnection()

  const truncatedAddress = address ? truncateAddress(address, 4) : ''

  return (
    <Button
      onClick={() => open()}
      size="sm"
      variant="outline"
    >
      <Wallet className="mr-2 h-4 w-4" />
      {isConnected ? truncatedAddress : 'Connect Wallet'}
    </Button>
  )
}
