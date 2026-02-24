import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { toast } from 'sonner'
import type { TransferEntity } from '@/db/index.types'
import type { ChainId } from '@repo/types'

interface LoadClaimTransfersInput {
  chainId: ChainId
  tokenAddress: string
  counterpartyAddress: string
  isProverSender?: boolean
  tokenType?: string
  fromDate?: Date
  toDate?: Date
}

interface UseLoadClaimTransfersParams {
  onSuccess: (data: TransferEntity[]) => void
}

export function useLoadClaimTransfers({ onSuccess }: UseLoadClaimTransfersParams) {
  return useMutation({
    mutationFn: async (input: LoadClaimTransfersInput) => {
      const res = await api.api.claims['load-transfers'].$post({
        json: {
          chainId: input.chainId,
          tokenAddress: input.tokenAddress,
          counterpartyAddress: input.counterpartyAddress,
          isProverSender: input.isProverSender ?? true,
          tokenType: (input.tokenType ?? 'erc20') as 'erc20' | 'erc721' | 'erc1155',
          fromDate: input.fromDate?.toISOString(),
          toDate: input.toDate?.toISOString(),
        },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to fetch transfers' }))
        throw new Error((body as { error?: string }).error || 'Failed to fetch transfers')
      }
      const data = await res.json()
      return data.transfers as unknown as TransferEntity[]
    },
    onSuccess,
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Failed to fetch transfers'),
  })
}
