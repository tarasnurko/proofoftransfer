import type { ClaimEntity, TokenEntity } from '@/db/index.types'

export type ClaimWithMeta = ClaimEntity & {
  proofCount: number
  token: TokenEntity | null
}

export type SerializedClaimWithMeta = Omit<ClaimWithMeta, 'created_at' | 'token'> & {
  created_at: string
  token: TokenEntity | null
}
