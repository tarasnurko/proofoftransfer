'use server'

import { getProofsByClaimId, getProofById } from '@/db/queries/proofs'
import { getVerificationStats } from '@/db/queries/verifications'
import type { Nullable } from '@/types'

export async function fetchProofsByClaimId(claimId: string) {
  return getProofsByClaimId(claimId)
}

export async function fetchProofById(id: string): Promise<Nullable<Awaited<ReturnType<typeof getProofById>>>> {
  return getProofById(id)
}

export async function fetchVerificationStats(proofId: string) {
  return getVerificationStats(proofId)
}
