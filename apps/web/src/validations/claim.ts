import { z } from 'zod'
import { ChainId } from '@repo/types'
import { ethereumAddressSchema, ethereumAddressLowercaseSchema } from './address'

export const MAX_TRANSFERS = 5000

export const createClaimSchema = z
  .object({
    claimMessage: z
      .string()
      .min(10, 'Message must be at least 10 characters')
      .max(1000, 'Message is too long (max 1000 characters)'),

    tokenAddress: ethereumAddressLowercaseSchema,

    recipientAddress: ethereumAddressLowercaseSchema,

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

export const createClaimClientSchema = z
  .object({
    claimMessage: z
      .string()
      .min(10, 'Message must be at least 10 characters')
      .max(1000, 'Message is too long (max 1000 characters)'),

    tokenAddress: ethereumAddressSchema,

    recipientAddress: ethereumAddressSchema,

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

    fromDate: z.date().optional().nullable(),
    toDate: z.date().optional().nullable(),

    chainId: z.nativeEnum(ChainId).default(ChainId.ETHEREUM),
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

export type CreateClaimClientInput = z.infer<typeof createClaimClientSchema>

export const fetchTransfersSchema = z
  .object({
    chainId: z.nativeEnum(ChainId).default(ChainId.BASE),
    tokenAddress: ethereumAddressLowercaseSchema,
    recipientAddress: ethereumAddressLowercaseSchema,
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
