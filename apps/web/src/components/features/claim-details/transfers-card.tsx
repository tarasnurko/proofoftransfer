'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { TransferListWithTabs } from '@/components/shared/transfer-list-with-tabs'
import type { ClaimEntity, EtherscanTransfer } from '@/types'
import { mapTransferToDisplayItem, groupDisplayTransfersByUser } from '@/utils/transfer.utils'
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
  tokenType?: string
  isLoading?: boolean
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
  tokenType,
  isLoading,
}: TransfersCardProps) {
  const sortSlotRef = useRef<HTMLDivElement>(null)
  const [sortSlotReady, setSortSlotReady] = useState(false)

  const sortSlotCallback = useCallback((node: HTMLDivElement | null) => {
    (sortSlotRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    setSortSlotReady(!!node)
  }, [])

  const mappedTransfers = useMemo(
    () => displayedTransfers.map(mapTransferToDisplayItem),
    [displayedTransfers],
  )

  const userCount = useMemo(
    () => groupDisplayTransfersByUser(transfers.map(mapTransferToDisplayItem)).length,
    [transfers],
  )

  return (
    <Card className="border-4">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-2xl font-bold">Transfers</CardTitle>
            <CardDescription>
              {isLoading ? (
                <Skeleton className="mt-1 inline-block h-4 w-48" />
              ) : (
                <>{transfers.length} transfer{transfers.length !== 1 ? 's' : ''} from {userCount} users</>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div ref={sortSlotCallback} />
            {!isLoading && isConnected && userTransferCount > 0 && (
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TransferListWithTabs
            transfers={[]}
            token={claim.token}
            walletAddress={walletAddress}
            chainId={claim.chainId}
            tokenType={tokenType}
            maxHeight={400}
            isLoading
          />
        ) : !displayedTransfers.length ? (
          <EmptyState
            icon={<FileSearch className="h-12 w-12" />}
            title="No Transfers"
            message={showOnlyMyTransfers ? "You don't have any transfers" : "No transfers found"}
          />
        ) : (
          <TransferListWithTabs
            transfers={mappedTransfers}
            token={claim.token}
            walletAddress={walletAddress}
            chainId={claim.chainId}
            tokenType={tokenType}
            maxHeight={400}
            renderSortSelect={(node) =>
              sortSlotReady && sortSlotRef.current && node
                ? createPortal(node, sortSlotRef.current)
                : null
            }
          />
        )}
      </CardContent>
    </Card>
  )
}
