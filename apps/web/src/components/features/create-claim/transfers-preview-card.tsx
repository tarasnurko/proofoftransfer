'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TransferListWithTabs } from '@/components/shared/transfer-list-with-tabs'
import { groupDisplayTransfersByUser } from '@/utils/transfer.utils'
import type { TransferEntity, TokenEntity } from '@/db/index.types'

interface TransfersPreviewCardProps {
  transfers: TransferEntity[]
  tokenData: TokenEntity | null
  walletAddress?: string
  chainId: number
  isConnected: boolean
  userTransferCount: number
  showOnlyMyTransfers: boolean
  onToggleMyTransfers: () => void
  isProverSender: boolean
}

export function TransfersPreviewCard({
  transfers,
  tokenData,
  walletAddress,
  chainId,
  isConnected,
  userTransferCount,
  showOnlyMyTransfers,
  onToggleMyTransfers,
}: TransfersPreviewCardProps) {
  const sortSlotRef = useRef<HTMLDivElement>(null)
  const [sortSlotReady, setSortSlotReady] = useState(false)

  const sortSlotCallback = useCallback((node: HTMLDivElement | null) => {
    (sortSlotRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    setSortSlotReady(!!node)
  }, [])

  const mappedTransfers = useMemo(
    () => transfers.map((t) => ({
      from: t.senderAddress,
      amount: 'amount' in t ? t.amount : '1',
      timestamp: t.blockTimestamp,
      tokenId: 'tokenId' in t ? t.tokenId : undefined,
    })),
    [transfers],
  )

  const token = useMemo(
    () => tokenData ? { decimals: tokenData.decimals, symbol: tokenData.symbol } : null,
    [tokenData?.decimals, tokenData?.symbol],
  )

  const userCount = useMemo(
    () => groupDisplayTransfersByUser(mappedTransfers).length,
    [mappedTransfers],
  )

  return (
    <Card className="border-4">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-2xl font-bold">Transfers Preview</CardTitle>
            <CardDescription>{transfers.length} transfers from {userCount} users</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div ref={sortSlotCallback} />
            {isConnected ? (
              <Button
                type="button"
                variant={showOnlyMyTransfers ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleMyTransfers}
                className="border-2 font-bold"
              >
                {showOnlyMyTransfers ? 'Show All' : `My Transfers (${userTransferCount})`}
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TransferListWithTabs
          transfers={mappedTransfers}
          token={token}
          walletAddress={walletAddress}
          chainId={chainId}
          maxHeight={300}
          emptyMessage={showOnlyMyTransfers ? "You don't have any transfers in this list" : undefined}
          renderSortSelect={(node) =>
            sortSlotReady && sortSlotRef.current && node
              ? createPortal(node, sortSlotRef.current)
              : null
          }
        />
      </CardContent>
    </Card>
  )
}
