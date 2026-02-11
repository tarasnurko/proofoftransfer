import type { TransferEntity } from '@/db/index.types'
import type { EtherscanTransfer } from '@/types'

export function mapDbToEtherscanTransfer(t: TransferEntity): EtherscanTransfer {
  return {
    hash: t.txHash,
    from: t.senderAddress,
    to: t.recipientAddress,
    contractAddress: t.tokenAddress,
    value: t.amount,
    timeStamp: t.blockTimestamp.toString(),
    blockNumber: t.blockNumber.toString(),
  }
}

export function mapTransferToDisplayItem(t: EtherscanTransfer) {
  return { from: t.from, amount: t.value, timestamp: parseInt(t.timeStamp) }
}
