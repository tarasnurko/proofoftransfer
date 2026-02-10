import type { ClaimEntity as BaseClaimEntity, TokenEntity as BaseTokenEntity } from '@/db/index.types'
import type { Nullable } from './common.types'

export interface ClaimEntity extends BaseClaimEntity {
  proofCount: number
  token: Nullable<BaseTokenEntity>
}

export interface TokenEntity extends BaseTokenEntity {}

export interface VerificationStats {
  successful: number
  failed: number
}

export interface ProofEntity {
  id: string
  claimId: string
  nullifier: string
  proofData: string
  publicInputs: object
  createdAt: Date
  verified?: boolean
  verificationResult?: {
    valid: boolean
    message?: string
  }
  verificationStats?: VerificationStats
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
