import type { ClaimEntity as BaseClaimEntity, TokenEntity as BaseTokenEntity } from '@/db/index.types'

export interface Chain {
  id: number
  name: string
}

export const SUPPORTED_CHAINS: Chain[] = [
  { id: 1, name: 'Ethereum' },
  { id: 10, name: 'Optimism' },
  { id: 56, name: 'BNB Chain' },
  { id: 137, name: 'Polygon' },
  { id: 8453, name: 'Base' },
  { id: 42161, name: 'Arbitrum' },
  { id: 534352, name: 'Scroll' },
]

export function getChainName(chainId: number): string {
  return SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || `Chain ${chainId}`
}

// Extended types with computed fields
export interface ClaimEntity extends BaseClaimEntity {
  proofCount: number
  token: BaseTokenEntity | null
}

export interface TokenEntity extends BaseTokenEntity {}

export interface ProofEntity {
  id: string
  claimId: string
  nullifier: string
  proofData: string
  publicInputs: object
  transfersRootHash: string
  proverAddress: string | null
  createdAt: Date
  verified?: boolean
  verificationResult?: {
    valid: boolean
    message?: string
  }
}

export interface EtherscanTransfer {
  hash: string
  from: string
  to: string
  contractAddress: string
  value: string
  timeStamp: string
  blockNumber: string
}
