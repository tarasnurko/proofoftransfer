import { z } from 'zod'
import { isAddress } from 'viem'

export const ethereumAddressSchema = z
  .string()
  .refine((val): boolean => isAddress(val), 'Invalid Ethereum address')

export const ethereumAddressLowercaseSchema = ethereumAddressSchema
  .transform((val) => val.toLowerCase())

const ENS_NAME_REGEX = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*\.eth$/i

export const ensOrAddressSchema = z
  .string()
  .refine(
    (val): boolean => isAddress(val) || ENS_NAME_REGEX.test(val),
    'Must be a valid Ethereum address or ENS name'
  )
