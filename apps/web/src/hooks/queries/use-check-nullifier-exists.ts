import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { api } from '@/lib/api/client'
import type { Nullable } from '@/types'

interface UseCheckNullifierExistsParams {
  claimId: string
  nullifier: Nullable<string>
}

export function useCheckNullifierExists({ claimId, nullifier }: UseCheckNullifierExistsParams) {
  return useQuery({
    queryKey: [QUERY_KEYS.NULLIFIER_EXISTS, claimId, nullifier],
    queryFn: async () => {
      const res = await api.api.claims[':id']['nullifier-exists'].$get({
        param: { id: claimId },
        query: { nullifier: nullifier! },
      })
      if (!res.ok) throw new Error('Failed to check nullifier')
      const data = await res.json()
      return data.exists
    },
    enabled: !!nullifier,
  })
}
