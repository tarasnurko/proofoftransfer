export interface GetERC20TransfersParams {
  chainId: number
  tokenAddress: string
  recipientAddress: string
  fromTimestamp?: number
  toTimestamp?: number
}
