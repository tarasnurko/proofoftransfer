import { z } from 'zod'
import { ChainId } from '@repo/types'

export const MAX_TRANSFERS = 5000

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

export const fetchTransfersSchema = z
  .object({
    chainId: z.nativeEnum(ChainId).default(ChainId.BASE),
    tokenAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
      .transform((val) => val.toLowerCase()),
    recipientAddress: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
      .transform((val) => val.toLowerCase()),
    fromDate: z.date().optional(),
    toDate: z.date().optional(),
  })
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

export type FetchTransfersInput = z.infer<typeof fetchTransfersSchema>

export function dateToTimestamp(date?: Date): number {
  return date instanceof Date ? Math.floor(date.getTime() / 1000) : 0
}
