'use client'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { Button } from '@/components/ui/button'

export function ConnectButton() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <Button
      onClick={() => open()}
      variant="outline"
      className="border-2 border-foreground bg-background px-4 py-2 font-bold uppercase hover:bg-foreground hover:text-background"
    >
      {isConnected && address ? formatAddress(address) : 'Connect Wallet'}
    </Button>
  )
}
