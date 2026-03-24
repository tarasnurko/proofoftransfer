'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ExternalLink } from 'lucide-react'
import { Address } from '@/components/shared/address'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isAddressEqual, zeroAddress, type Address as ViemAddress } from 'viem'
import { formatTokenAmount, formatTokenValue } from '@/utils/format.utils'
import { formatDateTime } from '@/utils/format.utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { getExplorerTxUrl } from '@/utils/explorer.utils'
import { truncateAddress } from '@/utils/format.utils'
import { TokenType } from '@repo/types'

export interface TransferDisplayItem {
  from: string
  amount: string
  timestamp: number
  txHash?: string
  tokenId?: string
}

interface VirtualTransferListProps {
  transfers: TransferDisplayItem[]
  token?: { decimals: number; symbol: string } | null
  walletAddress?: string
  chainId?: number
  tokenType?: string
  maxHeight?: number
  isLoading?: boolean
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
const SKELETON_ROW_COUNT = 7

function TransferListSkeleton({ maxHeight }: { maxHeight: number }) {
  return (
    <div className="space-y-1 overflow-y-auto" style={{ maxHeight }}>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <div key={i} className="flex w-full items-center justify-between border-2 border-border p-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="mt-1 h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function VirtualTransferList({
  transfers,
  token,
  walletAddress,
  chainId,
  tokenType,
  maxHeight = DEFAULT_MAX_HEIGHT,
  isLoading,
}: VirtualTransferListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: transfers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ITEM_HEIGHT,
    overscan: 5,
    gap: 4,
  })

  if (isLoading) return <TransferListSkeleton maxHeight={maxHeight} />

  if (!transfers.length) return null

  const totalSize = virtualizer.getTotalSize()
  const containerHeight = totalSize
    ? Math.min(totalSize, maxHeight)
    : maxHeight

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
    >
      <div
        className="relative w-full"
        style={{ height: `${totalSize}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const transfer = transfers[virtualItem.index]!
          const isUser = !!walletAddress && isAddressEqual(transfer.from as ViemAddress, walletAddress as ViemAddress)
          const isMint = isAddressEqual(transfer.from as ViemAddress, zeroAddress)

          return (
            <div
              key={virtualItem.index}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 flex w-full items-center justify-between gap-2 border-2 border-border p-2 sm:p-3"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-sm text-muted-foreground">From</span>
                  <Address address={transfer.from} chainId={chainId} chars={4} />
                  {isMint && (
                    <Badge className="bg-purple-500 text-white">Mint</Badge>
                  )}
                  {isUser && (
                    <Badge className="bg-accent text-accent-foreground">You</Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">
                  <span>{formatDateTime(transfer.timestamp * 1000)}</span>
                  {transfer.txHash && chainId && getExplorerTxUrl(chainId, transfer.txHash) ? (
                    <>
                      <span className="hidden sm:inline">·</span>
                      <a
                        href={getExplorerTxUrl(chainId, transfer.txHash)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono underline decoration-1 underline-offset-2 hover:opacity-70"
                      >
                        {truncateAddress(transfer.txHash)}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-3">
                {transfer.tokenId != null && (tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155) ? (
                  <span className="font-mono text-sm text-muted-foreground">#{transfer.tokenId}</span>
                ) : null}
                {tokenType !== TokenType.ERC721 ? (
                  <CopyableAmount amount={transfer.amount} token={token} />
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
