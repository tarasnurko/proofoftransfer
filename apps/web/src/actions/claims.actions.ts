'use server'

import { revalidatePath } from 'next/cache'
import { keccak256, toBytes } from 'viem'
import { actionClient } from '@/lib/safe-action'
import { createClaimSchema, transformClaimFormData } from '@/lib/validations/claim'
import { createClaim } from '@/db/queries/claims'
import type { InsertClaimEntity } from '@/db/index.types'
import { fetchAndStoreTokenDataAction } from './tokens.actions'

export const createClaimAction = actionClient
  .inputSchema(createClaimSchema)
  .action(async ({ parsedInput }) => {
    const transformed = transformClaimFormData(parsedInput)
    const messageHash = keccak256(toBytes(parsedInput.claimMessage))

    const claimData: InsertClaimEntity = {
      message: transformed.message,
      messageHash,
      tokenAddress: transformed.tokenAddress,
      recipientAddress: transformed.recipientAddress,
      minTransfersSum: transformed.minTransfersSum,
      maxTransfersSum: transformed.maxTransfersSum,
      fromBlockTimestamp: transformed.fromBlockTimestamp,
      toBlockTimestamp: transformed.toBlockTimestamp,
      chainId: transformed.chainId,
    }

    await fetchAndStoreTokenDataAction({
      tokenAddress: transformed.tokenAddress,
      chainId: transformed.chainId,
      recipientAddress: transformed.recipientAddress,
      fromTimestamp: transformed.fromBlockTimestamp || undefined,
      toTimestamp: transformed.toBlockTimestamp || undefined,
    })

    const result = await createClaim(claimData)
    revalidatePath('/')

    return { claimId: result.id }
  })
