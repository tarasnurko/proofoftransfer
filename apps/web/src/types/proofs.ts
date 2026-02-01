import type { ProofEntity } from '@/db/index.types'

export type ProofWithMeta = ProofEntity & {
  verificationCount: number
}

export type SerializedProofWithMeta = Omit<ProofWithMeta, 'created_at'> & {
  created_at: string
}
