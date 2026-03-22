import type { EtherscanERC20Transfer } from '@repo/types'
import type { ClaimConstraints } from '@repo/circuit-utils'

export const getClaimConstraintsFromTransfer = (
  transfer: EtherscanERC20Transfer,
): ClaimConstraints => ({
  minTransfersSum: BigInt(transfer.value),
  maxTransfersSum: BigInt(transfer.value),
  minTransfersCount: 0n,
  maxTransfersCount: 0n,
  fromBlockTimestamp: BigInt(transfer.timeStamp),
  toBlockTimestamp: BigInt(transfer.timeStamp),
})

export const getClaimConstraintsFromTransfers = (
  transfers: EtherscanERC20Transfer[],
): ClaimConstraints => {
  let totalSum = 0n
  let minTimestamp = BigInt(transfers[0]!.timeStamp)
  let maxTimestamp = BigInt(transfers[0]!.timeStamp)

  for (const transfer of transfers) {
    totalSum += BigInt(transfer.value)
    const timestamp = BigInt(transfer.timeStamp)
    if (timestamp < minTimestamp) minTimestamp = timestamp
    if (timestamp > maxTimestamp) maxTimestamp = timestamp
  }

  return {
    minTransfersSum: totalSum,
    maxTransfersSum: totalSum,
    minTransfersCount: 0n,
    maxTransfersCount: 0n,
    fromBlockTimestamp: minTimestamp,
    toBlockTimestamp: maxTimestamp,
  }
}
