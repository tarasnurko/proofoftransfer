'use client'

import React, { useMemo, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
import { VirtualUserList } from '@/components/shared/virtual-user-list'
import { groupDisplayTransfersByUser } from '@/utils/transfer.utils'
import type { TransferDisplayItem } from '@/components/shared/virtual-transfer-list'
import type { UserTransferGroup } from '@/utils/transfer.utils'

// ── Sort types ───────────────────────────────────────────────

export type TransferSortKey = 'newest' | 'oldest' | 'amount-desc' | 'amount-asc'
export type UserSortKey = 'count-desc' | 'count-asc' | 'amount-desc' | 'amount-asc' | 'newest' | 'oldest'

const TRANSFER_SORT_OPTIONS: { value: TransferSortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount-desc', label: 'Amount: high to low' },
  { value: 'amount-asc', label: 'Amount: low to high' },
]

const USER_SORT_OPTIONS: { value: UserSortKey; label: string }[] = [
  { value: 'count-desc', label: 'Most transfers' },
  { value: 'count-asc', label: 'Fewest transfers' },
  { value: 'amount-desc', label: 'Total: high to low' },
  { value: 'amount-asc', label: 'Total: low to high' },
  { value: 'newest', label: 'Most recent' },
  { value: 'oldest', label: 'Earliest' },
]

// ── Sort comparators ─────────────────────────────────────────

function sortTransfers(items: TransferDisplayItem[], key: TransferSortKey): TransferDisplayItem[] {
  const sorted = [...items]
  switch (key) {
    case 'newest': return sorted.sort((a, b) => b.timestamp - a.timestamp)
    case 'oldest': return sorted.sort((a, b) => a.timestamp - b.timestamp)
    case 'amount-desc': return sorted.sort((a, b) => {
      const diff = BigInt(b.amount) - BigInt(a.amount)
      return diff > 0n ? 1 : diff < 0n ? -1 : 0
    })
    case 'amount-asc': return sorted.sort((a, b) => {
      const diff = BigInt(a.amount) - BigInt(b.amount)
      return diff > 0n ? 1 : diff < 0n ? -1 : 0
    })
  }
}

function sortUsers(items: UserTransferGroup[], key: UserSortKey): UserTransferGroup[] {
  const sorted = [...items]
  switch (key) {
    case 'count-desc': return sorted.sort((a, b) => b.transferCount - a.transferCount)
    case 'count-asc': return sorted.sort((a, b) => a.transferCount - b.transferCount)
    case 'amount-desc': return sorted.sort((a, b) => {
      const diff = b.totalAmount - a.totalAmount
      return diff > 0n ? 1 : diff < 0n ? -1 : 0
    })
    case 'amount-asc': return sorted.sort((a, b) => {
      const diff = a.totalAmount - b.totalAmount
      return diff > 0n ? 1 : diff < 0n ? -1 : 0
    })
    case 'newest': return sorted.sort((a, b) => b.lastTransferDate - a.lastTransferDate)
    case 'oldest': return sorted.sort((a, b) => a.firstTransferDate - b.firstTransferDate)
  }
}

// ── Main component ───────────────────────────────────────────

interface TransferListWithTabsProps {
  transfers: TransferDisplayItem[]
  token?: { decimals: number; symbol: string } | null
  walletAddress?: string
  chainId?: number
  tokenType?: string
  maxHeight?: number
  isLoading?: boolean
  emptyMessage?: string
  /** Render prop: receives the sort select node. Place it wherever you want (e.g. card header). */
  renderSortSelect?: (sortSelect: React.ReactNode) => React.ReactNode
}

export function TransferListWithTabs({
  transfers,
  token,
  walletAddress,
  chainId,
  tokenType,
  maxHeight = 300,
  isLoading,
  emptyMessage,
  renderSortSelect,
}: TransferListWithTabsProps) {
  const [activeTab, setActiveTab] = useState<string>('transfers')
  const [transferSort, setTransferSort] = useState<TransferSortKey>('newest')
  const [userSort, setUserSort] = useState<UserSortKey>('count-desc')

  const userGroups = useMemo(
    () => groupDisplayTransfersByUser(transfers),
    [transfers],
  )

  const sortedTransfers = useMemo(
    () => sortTransfers(transfers, transferSort),
    [transfers, transferSort],
  )

  const sortedUsers = useMemo(
    () => sortUsers(userGroups, userSort),
    [userGroups, userSort],
  )

  const sortSelectNode = (
    activeTab === 'transfers' ? (
      <Select value={transferSort} onValueChange={(v) => setTransferSort(v as TransferSortKey)}>
        <SelectTrigger className="h-9 w-[180px] border-2 text-sm font-bold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TRANSFER_SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Select value={userSort} onValueChange={(v) => setUserSort(v as UserSortKey)}>
        <SelectTrigger className="h-9 w-[180px] border-2 text-sm font-bold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USER_SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  )

  if (isLoading) {
    return (
      <>
        {renderSortSelect?.(null)}
        <VirtualTransferList
          transfers={[]}
          token={token}
          walletAddress={walletAddress}
          chainId={chainId}
          tokenType={tokenType}
          maxHeight={maxHeight}
          isLoading
        />
      </>
    )
  }

  if (!transfers.length && emptyMessage) {
    return (
      <>
        {renderSortSelect?.(null)}
        <p className="py-8 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      </>
    )
  }

  return (
    <>
      {renderSortSelect ? renderSortSelect(sortSelectNode) : null}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {!renderSortSelect && (
          <div className="mt-3 flex justify-end">{sortSelectNode}</div>
        )}

        <TabsContent value="transfers">
          <VirtualTransferList
            transfers={sortedTransfers}
            token={token}
            walletAddress={walletAddress}
            chainId={chainId}
            tokenType={tokenType}
            maxHeight={maxHeight}
          />
        </TabsContent>

        <TabsContent value="users">
          <VirtualUserList
            groups={sortedUsers}
            token={token}
            walletAddress={walletAddress}
            chainId={chainId}
            tokenType={tokenType}
            maxHeight={maxHeight}
          />
        </TabsContent>
      </Tabs>
    </>
  )
}
