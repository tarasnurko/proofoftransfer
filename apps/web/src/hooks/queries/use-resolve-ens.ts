import { useQuery } from '@tanstack/react-query'
import { isAddress } from 'viem'
import { QUERY_KEYS } from '@/constants'
import { api } from '@/lib/api/client'
import type { Nullable } from '@/types/common.types'
import type { EnsResolution } from '@/types/blockchain.types'

interface UseResolveEnsParams {
  input: string
}

export function useResolveEns({ input }: UseResolveEnsParams) {
  const trimmed = input.trim()
  const isEns = trimmed.endsWith('.eth')
  const isAddr = isAddress(trimmed)
  const enabled = !!trimmed && (isEns || isAddr)

  return useQuery<Nullable<EnsResolution>>({
    queryKey: [QUERY_KEYS.ENS_RESOLVE, trimmed],
    queryFn: async () => {
      const res = await api.api.ens.resolve.$get({ query: { input: trimmed } })

      if (!res.ok) {
        if (isAddr) return { address: trimmed, ensName: null }
        return null
      }

      const { data } = await res.json()
      return { address: data.address, ensName: data.ensName }
    },
    enabled,
  })
}
