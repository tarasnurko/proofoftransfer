import type { TransferEntity } from '@/db/index.types'
import type { EtherscanTransfer } from '@/types'

export function mapDbToEtherscanTransfer(transfer: TransferEntity): EtherscanTransfer {
  const amount = 'amount' in transfer ? transfer.amount : '1'
  const tokenId = 'tokenId' in transfer ? transfer.tokenId : undefined

  return {
    hash: transfer.txHash,
    from: transfer.senderAddress,
    to: transfer.recipientAddress,
    contractAddress: transfer.tokenAddress,
    value: amount,
    timeStamp: transfer.blockTimestamp.toString(),
    blockNumber: transfer.blockNumber.toString(),
    tokenId,
  }
}

interface TransferDisplayItem {
  from: string
  amount: string
  timestamp: number
  txHash?: string
  tokenId?: string
}

export function mapTransferToDisplayItem(transfer: EtherscanTransfer): TransferDisplayItem {
  return {
    from: transfer.from,
    amount: transfer.value,
    timestamp: parseInt(transfer.timeStamp),
    txHash: transfer.hash,
    tokenId: transfer.tokenId,
  }
}

// ── User grouping ────────────────────────────────────────────

export interface UserTransferGroup {
  address: string
  transfers: TransferDisplayItem[]
  transferCount: number
  totalAmount: bigint
  firstTransferDate: number
  lastTransferDate: number
  avgAmount: bigint
  uniqueTokenIds?: string[]
}

export function groupDisplayTransfersByUser(
  transfers: TransferDisplayItem[],
): UserTransferGroup[] {
  const map = new Map<string, TransferDisplayItem[]>()

  for (const t of transfers) {
    const key = t.from.toLowerCase()
    const arr = map.get(key)
    if (arr) arr.push(t)
    else map.set(key, [t])
  }

  const groups: UserTransferGroup[] = []

  for (const [address, userTransfers] of map) {
    let totalAmount = 0n
    let first = Infinity
    let last = -Infinity
    const tokenIdSet = new Set<string>()

    for (const t of userTransfers) {
      totalAmount += BigInt(t.amount)
      if (t.timestamp < first) first = t.timestamp
      if (t.timestamp > last) last = t.timestamp
      if (t.tokenId) tokenIdSet.add(t.tokenId)
    }

    const count = userTransfers.length

    groups.push({
      address,
      transfers: userTransfers,
      transferCount: count,
      totalAmount,
      firstTransferDate: first,
      lastTransferDate: last,
      avgAmount: count > 0 ? totalAmount / BigInt(count) : 0n,
      uniqueTokenIds: tokenIdSet.size > 0 ? [...tokenIdSet] : undefined,
    })
  }

  groups.sort((a, b) => b.transferCount - a.transferCount)
  return groups
}
