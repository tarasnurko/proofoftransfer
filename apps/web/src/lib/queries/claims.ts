'use server'

import { getClaims, getClaimById } from '@/db/queries/claims'
import type { Nullable } from '@/types'

export async function fetchClaims() {
  const result = await getClaims({ limit: 50, offset: 0 })
  return { data: result.claims, total: result.total }
}

export async function fetchClaimById(id: string): Promise<Nullable<Awaited<ReturnType<typeof getClaimById>>>> {
  return getClaimById(id)
}
