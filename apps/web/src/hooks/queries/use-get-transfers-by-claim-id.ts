import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { api } from '@/lib/api/client'
import type { EtherscanTransfer } from '@/types'

export function useGetTransfersByClaimId(claimId: string) {
  return useQuery<EtherscanTransfer[]>({
    queryKey: [QUERY_KEYS.CLAIM_TRANSFERS, claimId],
    queryFn: async () => {
      const res = await api.api.claims[':id'].transfers.$get({
        param: { id: claimId },
      })
      if (!res.ok) throw new Error('Failed to fetch transfers')
      return res.json() as Promise<EtherscanTransfer[]>
    },
  })
}
