'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
import type { ClaimEntity, EtherscanTransfer } from '@/lib/types'
import { FileSearch } from 'lucide-react'

interface TransfersCardProps {
  claim: ClaimEntity
  transfers: EtherscanTransfer[]
  displayedTransfers: EtherscanTransfer[]
  userTransferCount: number
  isConnected: boolean
  showOnlyMyTransfers: boolean
  onToggleMyTransfers: () => void
  walletAddress?: string
}

export function TransfersCard({
  claim,
  transfers,
  displayedTransfers,
  userTransferCount,
  isConnected,
  showOnlyMyTransfers,
  onToggleMyTransfers,
  walletAddress,
}: TransfersCardProps) {
  return (
    <Card className="border-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Transfers</CardTitle>
            <CardDescription>
              {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} matching this claim
            </CardDescription>
          </div>
          {isConnected && userTransferCount > 0 && (
            <Button
              variant={showOnlyMyTransfers ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleMyTransfers}
              className="border-2 font-bold"
            >
              {showOnlyMyTransfers ? 'Show All' : `My Transfers (${userTransferCount})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!displayedTransfers.length ? (
          <EmptyState
            icon={<FileSearch className="h-12 w-12" />}
            title="No Transfers"
            message={showOnlyMyTransfers ? "You don't have any transfers" : "No transfers found"}
          />
        ) : (
          <VirtualTransferList
            transfers={displayedTransfers.map((t) => ({
              from: t.from,
              amount: t.value,
              timestamp: parseInt(t.timeStamp),
            }))}
            token={claim.token}
            walletAddress={walletAddress}
            chainId={claim.chainId}
            maxHeight={400}
          />
        )}
      </CardContent>
    </Card>
  )
}
