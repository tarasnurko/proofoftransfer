'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
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

  return (
    <Card className="border-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Transfers Preview</CardTitle>
            <CardDescription>{transfers.length} transfers found</CardDescription>
          </div>
          {isConnected && userTransferCount > 0 ? (
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
      </CardHeader>
      <CardContent>
        <VirtualTransferList
          transfers={mappedTransfers}
          token={token}
          walletAddress={walletAddress}
          chainId={chainId}
          maxHeight={300}
        />
      </CardContent>
    </Card>
  )
}
