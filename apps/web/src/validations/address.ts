import { z } from 'zod'
import { isAddress } from 'viem'

export const ethereumAddressSchema = z
  .string()
  .refine((val): boolean => isAddress(val), 'Invalid Ethereum address')

export const ethereumAddressLowercaseSchema = ethereumAddressSchema
  .transform((val) => val.toLowerCase())
