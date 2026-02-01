import { z } from 'zod'
import { ChainId } from '@repo/types'

export const createClaimSchema = z
  .object({
    claimMessage: z
      .string()
      .min(10, 'Message must be at least 10 characters')
      .max(1000, 'Message is too long (max 1000 characters)'),

    tokenAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
      .transform((val) => val.toLowerCase()),

    recipientAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
      .transform((val) => val.toLowerCase()),

    minTransfersSum: z
      .string()
      .default('0')
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Must be a non-negative number',
      }),

    maxTransfersSum: z
      .string()
      .default('0')
      .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: 'Must be a non-negative number',
      }),

    fromDate: z.date().optional(),
    toDate: z.date().optional(),

    chainId: z.nativeEnum(ChainId).default(ChainId.BASE),
  })
  .refine(
    (data) => {
      const min = Number(data.minTransfersSum)
      const max = Number(data.maxTransfersSum)
      if (max > 0 && max < min) {
        return false
      }
      return true
    },
    {
      message: 'Maximum amount must be greater than or equal to minimum amount',
      path: ['maxTransfersSum'],
    }
  )
  .refine(
    (data) => {
      if (data.fromDate && data.toDate && data.toDate < data.fromDate) {
        return false
      }
      return true
    },
    {
      message: 'End date must be after start date',
      path: ['toDate'],
    }
  )

export type CreateClaimInput = z.infer<typeof createClaimSchema>

export function transformClaimFormData(data: CreateClaimInput) {
  return {
    message: data.claimMessage,
    token_address: data.tokenAddress,
    recipient_address: data.recipientAddress,
    min_transfers_sum: data.minTransfersSum,
    max_transfers_sum: data.maxTransfersSum,
    from_block_timestamp: data.fromDate instanceof Date ? Math.floor(data.fromDate.getTime() / 1000) : 0,
    to_block_timestamp: data.toDate instanceof Date ? Math.floor(data.toDate.getTime() / 1000) : 0,
    chain_id: data.chainId,
  }
}
