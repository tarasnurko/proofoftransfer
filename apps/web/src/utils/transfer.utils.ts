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
