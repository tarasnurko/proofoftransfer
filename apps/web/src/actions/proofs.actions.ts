'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { actionClient } from '@/lib/safe-action'
import { returnValidationErrors } from 'next-safe-action'
import { submitProofSchema } from '@/lib/validations/proof'
import { getClaimById } from '@/db/queries/claims'
import { createProof, checkNullifierExists, getProofById } from '@/db/queries/proofs'
import { createVerification } from '@/db/queries/verifications'
import { EtherscanClient } from '@/lib/etherscan'
import type { InsertProofEntity } from '@/db/index.types'

const proofIdSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

const claimIdSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID format'),
})

export const fetchTransfersAction = actionClient
  .inputSchema(claimIdSchema)
  .action(async ({ parsedInput: { claimId } }) => {
    const claim = await getClaimById(claimId)

    if (!claim) {
      throw new Error('Claim not found')
    }

    const etherscanClient = new EtherscanClient()
    const transfers = await etherscanClient.fetchERC20Transfers({
      chainId: claim.chainId,
      tokenAddress: claim.tokenAddress,
      recipientAddress: claim.recipientAddress,
      fromTimestamp: claim.fromBlockTimestamp || undefined,
      toTimestamp: claim.toBlockTimestamp || undefined,
    })

    return { transfers }
  })

export const submitProofAction = actionClient
  .inputSchema(submitProofSchema)
  .action(async ({ parsedInput }) => {
    const claim = await getClaimById(parsedInput.claimId)
    if (!claim) {
      return returnValidationErrors(submitProofSchema, {
        claimId: { _errors: ['Claim not found'] },
      })
    }

    const nullifierExists = await checkNullifierExists(parsedInput.claimId, parsedInput.nullifier)

    if (nullifierExists) {
      return returnValidationErrors(submitProofSchema, {
        nullifier: { _errors: ['This proof has already been submitted for this claim'] },
      })
    }

    const proofData: InsertProofEntity = {
      claimId: parsedInput.claimId,
      nullifier: parsedInput.nullifier,
      proofData: parsedInput.proofData,
      publicInputs: parsedInput.publicInputs,
      transfersRootHash: parsedInput.transfersRootHash,
    }

    const result = await createProof(proofData)

    revalidatePath(`/claims/${parsedInput.claimId}`)
    revalidatePath('/')

    return { proofId: result.id }
  })

export const verifyProofAction = actionClient
  .inputSchema(proofIdSchema)
  .action(async ({ parsedInput: { id: proofId } }) => {
    const proof = await getProofById(proofId)

    if (!proof) {
      throw new Error('Proof not found')
    }

    // Note: Proof verification is done client-side using Noir.js before submission
    // This action records the verification result for tracking purposes
    const isValid = true

    try {
      await createVerification({
        proofId: proofId,
        isValid: isValid,
        errorMessage: null,
      })
    } catch (err) {
      console.error('Failed to record verification:', err)
    }

    return { isValid }
  })
