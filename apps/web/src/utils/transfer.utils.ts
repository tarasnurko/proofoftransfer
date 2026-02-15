import type { TransferEntity } from '@/db/index.types'
import type { EtherscanTransfer } from '@/types'

export function mapDbToEtherscanTransfer(transfer: TransferEntity): EtherscanTransfer {
  return {
    hash: transfer.txHash,
    from: transfer.senderAddress,
    to: transfer.recipientAddress,
    contractAddress: transfer.tokenAddress,
    value: transfer.amount,
    timeStamp: transfer.blockTimestamp.toString(),
    blockNumber: transfer.blockNumber.toString(),
  }
}

export function mapTransferToDisplayItem(transfer: EtherscanTransfer) {
  return { from: transfer.from, amount: transfer.value, timestamp: parseInt(transfer.timeStamp) }
}
