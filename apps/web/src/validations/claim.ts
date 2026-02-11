import { z } from 'zod'
import { ChainId } from '@repo/types'
import { ethereumAddressSchema, ethereumAddressLowercaseSchema } from './address'

export const MAX_TRANSFERS = 5000

// ── Shared field schemas ──

const claimMessageSchema = z
  .string()
  .min(10, 'Message must be at least 10 characters')
  .max(1000, 'Message is too long (max 1000 characters)')

const nonNegativeAmountSchema = z
  .string()
  .default('0')
  .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Must be a non-negative number',
  })

// ── Shared refinements ──

function checkAmountRange(data: { minTransfersSum: string; maxTransfersSum: string }): boolean {
  const min = Number(data.minTransfersSum)
  const max = Number(data.maxTransfersSum)
  return !(max > 0 && max < min)
}

const amountRangeMessage = {
  message: 'Maximum amount must be greater than or equal to minimum amount',
  path: ['maxTransfersSum'],
}

function checkDateRange(data: { fromDate?: Date | null; toDate?: Date | null }): boolean {
  if (data.fromDate && data.toDate && data.toDate < data.fromDate) return false
  return true
}

const dateRangeMessage = {
  message: 'End date must be after start date',
  path: ['toDate'],
}

// ── Schemas ──

export const createClaimSchema = z
  .object({
    claimMessage: claimMessageSchema,
    tokenAddress: ethereumAddressLowercaseSchema,
    recipientAddress: ethereumAddressLowercaseSchema,
    minTransfersSum: nonNegativeAmountSchema,
    maxTransfersSum: nonNegativeAmountSchema,
    fromDate: z.date().optional(),
    toDate: z.date().optional(),
    chainId: z.nativeEnum(ChainId).default(ChainId.BASE),
  })
  .refine(checkAmountRange, amountRangeMessage)
  .refine(checkDateRange, dateRangeMessage)

export type CreateClaimInput = z.infer<typeof createClaimSchema>

export const createClaimClientSchema = z
  .object({
    claimMessage: claimMessageSchema,
    tokenAddress: ethereumAddressSchema,
    recipientAddress: ethereumAddressSchema,
    minTransfersSum: nonNegativeAmountSchema,
    maxTransfersSum: nonNegativeAmountSchema,
    fromDate: z.date().optional().nullable(),
    toDate: z.date().optional().nullable(),
    chainId: z.nativeEnum(ChainId).default(ChainId.ETHEREUM),
  })
  .refine(checkAmountRange, amountRangeMessage)
  .refine(checkDateRange, dateRangeMessage)

export type CreateClaimClientInput = z.infer<typeof createClaimClientSchema>

export const fetchTransfersSchema = z
  .object({
    chainId: z.nativeEnum(ChainId).default(ChainId.BASE),
    tokenAddress: ethereumAddressLowercaseSchema,
    recipientAddress: ethereumAddressLowercaseSchema,
    fromDate: z.date().optional(),
    toDate: z.date().optional(),
  })
  .refine(checkDateRange, dateRangeMessage)

export type FetchTransfersInput = z.infer<typeof fetchTransfersSchema>

export function dateToTimestamp(date?: Date): number {
  return date instanceof Date ? Math.floor(date.getTime() / 1000) : 0
}
