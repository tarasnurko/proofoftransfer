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
  transfers: TransferEntity[]
  transferCount: number
  totalAmount: bigint
  firstTransferDate: number
  lastTransferDate: number
  avgAmount: bigint
  uniqueTokenIds?: string[]
}

export function groupTransfersByUser(
  transfers: TransferEntity[],
  isProverSender: boolean,
): UserTransferGroup[] {
  const map = new Map<string, TransferEntity[]>()

  for (const t of transfers) {
    const key = (isProverSender ? t.senderAddress : t.recipientAddress).toLowerCase()
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
      const amount = 'amount' in t ? BigInt(t.amount) : 1n
      totalAmount += amount
      if (t.blockTimestamp < first) first = t.blockTimestamp
      if (t.blockTimestamp > last) last = t.blockTimestamp
      if ('tokenId' in t && t.tokenId) tokenIdSet.add(t.tokenId)
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
