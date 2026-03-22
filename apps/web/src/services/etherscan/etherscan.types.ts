export interface GetTransfersParams {
  chainId: number
  tokenAddress: string
  address: string
  fromTimestamp?: number
  toTimestamp?: number
}
