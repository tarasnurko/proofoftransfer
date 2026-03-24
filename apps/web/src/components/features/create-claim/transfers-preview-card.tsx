'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
import { VirtualUserList } from '@/components/shared/virtual-user-list'
import { groupTransfersByUser } from '@/utils/transfer.utils'
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
  isProverSender,
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

  const userGroups = useMemo(
    () => groupTransfersByUser(transfers, isProverSender),
    [transfers, isProverSender],
  )

  return (
    <Card className="border-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Transfers Preview</CardTitle>
            <CardDescription>{transfers.length} transfers from {userGroups.length} users</CardDescription>
          </div>
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
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transfers">
          <TabsList>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="transfers">
            {showOnlyMyTransfers && !mappedTransfers.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                You don&apos;t have any transfers in this list
              </p>
            ) : (
              <VirtualTransferList
                transfers={mappedTransfers}
                token={token}
                walletAddress={walletAddress}
                chainId={chainId}
                maxHeight={300}
              />
            )}
          </TabsContent>

          <TabsContent value="users">
            <VirtualUserList
              groups={userGroups}
              token={token}
              walletAddress={walletAddress}
              chainId={chainId}
              maxHeight={300}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
