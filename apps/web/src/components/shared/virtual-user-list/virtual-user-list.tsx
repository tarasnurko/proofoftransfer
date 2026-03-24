'use client'

import { useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { isAddressEqual, zeroAddress, type Address as ViemAddress } from 'viem'
import { Address } from '@/components/shared/address'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTokenAmount, formatDateTime, truncateAddress } from '@/utils/format.utils'
import { getExplorerTxUrl } from '@/utils/explorer.utils'
import { TokenType } from '@repo/types'
import type { UserTransferGroup } from '@/utils/transfer.utils'

interface VirtualUserListProps {
  groups: UserTransferGroup[]
  token?: { decimals: number; symbol: string } | null
  walletAddress?: string
  chainId?: number
  tokenType?: string
  maxHeight?: number
  isLoading?: boolean
}

const ESTIMATED_ITEM_HEIGHT = 88
const DEFAULT_MAX_HEIGHT = 400
const SKELETON_ROW_COUNT = 5

function UserListSkeleton({ maxHeight }: { maxHeight: number }) {
  return (
    <div className="space-y-1 overflow-y-auto" style={{ maxHeight }}>
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        <div key={i} className="border-2 border-border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-12" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="mt-1.5 flex gap-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

function UserTransferRow({
  transfer,
  token,
  chainId,
  tokenType,
}: {
  transfer: UserTransferGroup['transfers'][number]
  token?: { decimals: number; symbol: string } | null
  chainId?: number
  tokenType?: string
}) {
  const amount = 'amount' in transfer ? transfer.amount : '1'
  const tokenId = 'tokenId' in transfer ? transfer.tokenId : undefined

  return (
    <div className="flex items-center justify-between gap-2 border border-border bg-muted/30 p-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-2 sm:text-sm">
          <span>{formatDateTime(transfer.blockTimestamp * 1000)}</span>
          {transfer.txHash && chainId && getExplorerTxUrl(chainId, transfer.txHash) ? (
            <>
              <span className="hidden sm:inline">&middot;</span>
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
      <div className="flex shrink-0 items-center gap-3">
        {tokenId != null && (tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155) ? (
          <span className="font-mono text-sm text-muted-foreground">#{tokenId}</span>
        ) : null}
        {tokenType !== TokenType.ERC721 && token ? (
          <span className="text-right font-mono">
            {formatTokenAmount(amount, token.decimals, token.symbol)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function VirtualUserList({
  groups,
  token,
  walletAddress,
  chainId,
  tokenType,
  maxHeight = DEFAULT_MAX_HEIGHT,
  isLoading,
}: VirtualUserListProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [expandedAddresses, setExpandedAddresses] = useState<Set<string>>(new Set())

  const toggleExpanded = (address: string) => {
    setExpandedAddresses((prev) => {
      const next = new Set(prev)
      if (next.has(address)) next.delete(address)
      else next.add(address)
      return next
    })
  }

  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const group = groups[index]!
      if (expandedAddresses.has(group.address)) {
        return ESTIMATED_ITEM_HEIGHT + group.transferCount * 44 + 8
      }
      return ESTIMATED_ITEM_HEIGHT
    },
    overscan: 3,
    gap: 4,
  })

  if (isLoading) return <UserListSkeleton maxHeight={maxHeight} />
  if (!groups.length) return null

  const totalSize = virtualizer.getTotalSize()
  const containerHeight = Math.min(totalSize, maxHeight)

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
          const group = groups[virtualItem.index]!
          const isExpanded = expandedAddresses.has(group.address)
          const isUser = !!walletAddress && isAddressEqual(group.address as ViemAddress, walletAddress as ViemAddress)
          const isMint = isAddressEqual(group.address as ViemAddress, zeroAddress)

          return (
            <div
              key={group.address}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full border-2 border-border"
              style={{ transform: `translateY(${virtualItem.start}px)` }}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(group.address)}
                className="flex w-full cursor-pointer items-start justify-between gap-2 p-2 text-left hover:bg-muted/50 sm:p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 shrink-0" />
                      : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <Address address={group.address} chainId={chainId} chars={4} />
                    <Badge variant="outline" className="border-2 font-bold">
                      {group.transferCount} tx{group.transferCount !== 1 ? 's' : ''}
                    </Badge>
                    {isMint && (
                      <Badge className="bg-purple-500 text-white">Mint</Badge>
                    )}
                    {isUser && (
                      <Badge className="bg-accent text-accent-foreground">You</Badge>
                    )}
                  </div>
                  <div className="ml-5.5 mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
                    <span>
                      {group.firstTransferDate === group.lastTransferDate
                        ? formatDateTime(group.firstTransferDate * 1000)
                        : `${formatDateTime(group.firstTransferDate * 1000)} — ${formatDateTime(group.lastTransferDate * 1000)}`}
                    </span>
                    {group.uniqueTokenIds && (tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155) ? (
                      <span>{group.uniqueTokenIds.length} token{group.uniqueTokenIds.length !== 1 ? 's' : ''}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {tokenType !== TokenType.ERC721 && token ? (
                    <>
                      <span className="font-mono text-sm font-bold">
                        {formatTokenAmount(group.totalAmount.toString(), token.decimals, token.symbol)}
                      </span>
                      {group.transferCount > 1 ? (
                        <span className="font-mono text-xs text-muted-foreground">
                          avg {formatTokenAmount(group.avgAmount.toString(), token.decimals, token.symbol)}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </button>

              {isExpanded && (
                <div className="space-y-1 border-t-2 border-border p-2">
                  {group.transfers.map((t, i) => (
                    <UserTransferRow
                      key={`${t.txHash ?? ''}-${i}`}
                      transfer={t}
                      token={token}
                      chainId={chainId}
                      tokenType={tokenType}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
