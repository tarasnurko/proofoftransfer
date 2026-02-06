'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Address } from '@/components/shared/address'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatTokenAmount, formatTokenValue } from '@/lib/address-utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

export interface TransferDisplayItem {
  from: string
  amount: string
  timestamp: number
  txHash?: string
}

interface VirtualTransferListProps {
  transfers: TransferDisplayItem[]
  token?: { decimals: number; symbol: string } | null
  walletAddress?: string
  chainId?: number
  maxHeight?: number
}

function CopyableAmount({ amount, token }: { amount: string; token?: { decimals: number; symbol: string } | null }) {
  const numericValue = amount && token ? formatTokenValue(amount, token.decimals) : amount
  const display = amount && token ? formatTokenAmount(amount, token.decimals, token.symbol) : amount
  const { copied, copy } = useCopyToClipboard()

  return (
    <Tooltip open={copied}>
      <TooltipTrigger asChild>
        <span onClick={() => copy(numericValue)} className="cursor-pointer text-right font-mono hover:opacity-70">
          {display}
        </span>
      </TooltipTrigger>
      <TooltipContent>Copied!</TooltipContent>
    </Tooltip>
  )
}

const ESTIMATED_ITEM_HEIGHT = 76
const DEFAULT_MAX_HEIGHT = 400

export function VirtualTransferList({
  transfers,
  token,
  walletAddress,
  chainId,
  maxHeight = DEFAULT_MAX_HEIGHT,
}: VirtualTransferListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: transfers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: 5,
    gap: 4,
  })

  if (!transfers.length) return null

  const totalSize = virtualizer.getTotalSize()

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: Math.min(totalSize, maxHeight) }}
    >
      <div
        className="relative w-full"
        style={{ height: `${totalSize}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const transfer = transfers[virtualItem.index]!
          const isUser = walletAddress && transfer.from.toLowerCase() === walletAddress.toLowerCase()

          return (
            <div
              key={virtualItem.index}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 flex w-full items-center justify-between border-2 border-border p-3"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">From</span>
                  <Address address={transfer.from} chainId={chainId} />
                  {isUser && (
                    <Badge className="bg-accent text-accent-foreground">You</Badge>
                  )}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {new Date(transfer.timestamp * 1000).toLocaleDateString()}
                </div>
              </div>
              <CopyableAmount
                amount={transfer.amount}
                token={token}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
