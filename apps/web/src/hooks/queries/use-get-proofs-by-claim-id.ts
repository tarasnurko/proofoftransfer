import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { api } from '@/lib/api/client'
import type { ProofEntity, SortOrder } from '@/types'

interface ProofsApiResponse {
  proofs: ProofEntity[]
  total: number
}

interface UseGetProofsByClaimIdParams {
  claimId: string
  search: string
  sortOrder: SortOrder
  page: number
  limit: number
}

export function useGetProofsByClaimId({ claimId, search, sortOrder, page, limit }: UseGetProofsByClaimIdParams) {
  return useQuery<ProofsApiResponse>({
    queryKey: [QUERY_KEYS.PROOFS, claimId, { search, sortOrder, page }],
    queryFn: async () => {
      const res = await api.api.claims[':id'].proofs.$get({
        param: { id: claimId },
        query: {
          page: String(page),
          limit: String(limit),
          sortOrder,
          ...(search ? { search } : {}),
        },
      })
      if (!res.ok) throw new Error('Failed to fetch proofs')
      return res.json() as unknown as ProofsApiResponse
    },
    placeholderData: keepPreviousData,
  })
}
