import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { api } from '@/lib/api/client'
import type { Nullable } from '@/types'

interface UseGetVerifierStatusParams {
  claimId: string
  proofId: string
  nullifier: Nullable<string>
}

export function useGetVerifierStatus({ claimId, proofId, nullifier }: UseGetVerifierStatusParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.VERIFIER_STATUS, proofId, nullifier],
    queryFn: async () => {
      const res = await api.api.claims[':id'].proofs[':proofId']['verifier-status'].$get({
        param: { id: claimId, proofId },
        query: { nullifier: nullifier! },
      })
      if (!res.ok) throw new Error('Failed to check verifier status')
      return res.json()
    },
    enabled: !!nullifier,
  })
}
