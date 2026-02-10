import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { fetchClaimTransfersFromDbAction } from '@/actions/proofs.actions'
import type { EtherscanTransfer } from '@/types'

export function useGetTransfersByClaimId(claimId: string) {
  const { data: transfers = [], isLoading, error } = useQuery<EtherscanTransfer[]>({
    queryKey: [QUERY_KEYS.CLAIM_TRANSFERS, claimId],
    queryFn: async () => {
      const result = await fetchClaimTransfersFromDbAction({ claimId })
      if (result?.serverError) throw new Error(result.serverError)
      return result?.data ?? []
    },
  })

  return { transfers, isLoading, error }
}
