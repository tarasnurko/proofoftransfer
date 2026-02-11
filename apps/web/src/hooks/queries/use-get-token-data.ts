import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { api } from '@/lib/api/client'
import type { Nullable, TokenEntity } from '@/types'

interface UseGetTokenDataParams {
  tokenAddress: string
  chainId: number
  enabled: boolean
}

export function useGetTokenData({ tokenAddress, chainId, enabled }: UseGetTokenDataParams) {
  return useQuery<Nullable<TokenEntity>>({
    queryKey: [QUERY_KEYS.TOKEN, tokenAddress, chainId],
    queryFn: async () => {
      const res = await api.api.tokens.$get({
        query: { tokenAddress, chainId: String(chainId) },
      })
      if (!res.ok) throw new Error('Token not found on this chain')
      const { data } = await res.json()
      return data as unknown as TokenEntity
    },
    enabled,
  })
}
