import type { EtherscanERC20Transfer } from '@repo/types'

export const shuffleArray = <T>(arr: T[]): T[] => {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}

export const mergeAndShuffle = <T>(arr: T[], valuesToInsert: T[]): T[] => {
  return shuffleArray([...shuffleArray(arr), ...shuffleArray(valuesToInsert)])
}

export const findTransferIndices = (
  proverTransfers: EtherscanERC20Transfer[],
  allTransfers: EtherscanERC20Transfer[],
): number[] => {
  return proverTransfers.map((proverTransfer) => {
    return allTransfers
      .map((transfer, index) => ({ transfer, index }))
      .filter((item) => item.transfer.blockHash === proverTransfer.blockHash)
      .map((item) => item.index)[0]!
  })
}
