'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from './ui/button'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="font-medium">Connected:</span>{' '}
          <span className="font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <Button onClick={() => disconnect()} variant="outline">
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground mb-2">Connect your wallet to get started</p>
      <div className="flex gap-2">
        {connectors.map((connector) => (
          <Button
            key={connector.id}
            onClick={() => connect({ connector })}
            disabled={isPending}
          >
            {isPending ? 'Connecting...' : `Connect ${connector.name}`}
          </Button>
        ))}
      </div>
    </div>
  )
}
