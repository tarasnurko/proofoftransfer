import { z } from 'zod'
import { ChainId, TokenType } from '@repo/types'
import { ethereumAddressSchema, ethereumAddressLowercaseSchema, ensOrAddressSchema } from './address'

export const MAX_CLAIM_TRANSFERS = 5000

// -- Shared field schemas --

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

export const tokenTypeSchema = z.nativeEnum(TokenType)

// -- Shared refinements --

function checkAmountRange(data: { minTransfersSum: string; maxTransfersSum: string }): boolean {
  const min = Number(data.minTransfersSum)
  const max = Number(data.maxTransfersSum)
  return !(max > 0 && max < min)
}

const AMOUNT_RANGE_MESSAGE = {
  message: 'Maximum amount must be greater than or equal to minimum amount',
  path: ['maxTransfersSum'],
}

function checkCountRange(data: { minTransfersCount: number; maxTransfersCount: number }): boolean {
  if (data.maxTransfersCount > 0 && data.maxTransfersCount < data.minTransfersCount) return false
  return true
}

const COUNT_RANGE_MESSAGE = {
  message: 'Maximum count must be greater than or equal to minimum count',
  path: ['maxTransfersCount'],
}

function checkDateRange(data: { fromDate?: Date | null; toDate: Date }): boolean {
  if (data.fromDate && data.toDate < data.fromDate) return false
  return true
}

const DATE_RANGE_MESSAGE = {
  message: 'End date must be after start date',
  path: ['toDate'],
}

// -- Schemas --

export const createClaimSchema = z
  .object({
    claimMessage: claimMessageSchema,
    tokenAddress: ethereumAddressLowercaseSchema,
    counterpartyAddress: ethereumAddressLowercaseSchema,
    isProverSender: z.boolean(),
    tokenType: tokenTypeSchema,
    minTransfersSum: nonNegativeAmountSchema,
    maxTransfersSum: nonNegativeAmountSchema,
    minTransfersCount: z.number().int().min(0).default(0),
    maxTransfersCount: z.number().int().min(0).default(0),
    fromDate: z.date().optional(),
    toDate: z.date(),
    chainId: z.nativeEnum(ChainId).default(ChainId.BASE),
  })
  .refine(checkAmountRange, AMOUNT_RANGE_MESSAGE)
  .refine(checkCountRange, COUNT_RANGE_MESSAGE)
  .refine(checkDateRange, DATE_RANGE_MESSAGE)

export type CreateClaimInput = z.infer<typeof createClaimSchema>

export const createClaimClientSchema = z
  .object({
    claimMessage: claimMessageSchema,
    tokenAddress: ethereumAddressSchema,
    counterpartyAddress: ensOrAddressSchema,
    isProverSender: z.boolean(),
    tokenType: tokenTypeSchema,
    minTransfersSum: nonNegativeAmountSchema,
    maxTransfersSum: nonNegativeAmountSchema,
    minTransfersCount: z.number().int().min(0).default(0),
    maxTransfersCount: z.number().int().min(0).default(0),
    fromDate: z.date().optional().nullable(),
    toDate: z.date(),
    chainId: z.nativeEnum(ChainId).default(ChainId.ETHEREUM),
  })
  .refine(checkAmountRange, AMOUNT_RANGE_MESSAGE)
  .refine(checkCountRange, COUNT_RANGE_MESSAGE)
  .refine(checkDateRange, DATE_RANGE_MESSAGE)

export type CreateClaimClientInput = z.infer<typeof createClaimClientSchema>

export const fetchTransfersSchema = z
  .object({
    chainId: z.nativeEnum(ChainId).default(ChainId.BASE),
    tokenAddress: ethereumAddressLowercaseSchema,
    counterpartyAddress: ethereumAddressLowercaseSchema,
    isProverSender: z.boolean().default(true),
    tokenType: tokenTypeSchema.default(TokenType.ERC20),
    fromDate: z.date().optional(),
    toDate: z.date(),
  })
  .refine(checkDateRange, DATE_RANGE_MESSAGE)

export type FetchTransfersInput = z.infer<typeof fetchTransfersSchema>
