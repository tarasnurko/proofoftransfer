import type { Nullable } from './common.types'

export interface TokenMetadata {
  name: string
  symbol: string
  decimals: number
}

export interface EnsResolution {
  address: string
  ensName: Nullable<string>
}
