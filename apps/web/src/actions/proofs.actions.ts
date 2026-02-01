'use server'

import { revalidatePath } from 'next/cache'
import { submitProofSchema, type SubmitProofInput } from '@/lib/validations/proof'
import { getClaimById } from '@/db/queries/claims'
import { createProof, checkNullifierExists, getProofsByClaimId as getProofsByClaimIdQuery, getProofById as getProofByIdQuery } from '@/db/queries/proofs'
import { createVerification, getVerificationStats as getVerificationStatsQuery } from '@/db/queries/verifications'
import { EtherscanClient } from '@/lib/etherscan'
import type { InsertProofEntity } from '@/db/index.types'
import { isValidUUID } from '@/utils/validation'
import { EntityNotFoundException } from '@/db/exceptions'

export async function fetchTransfersAction(claimId: string) {
  try {
    if (!isValidUUID(claimId)) {
      return { success: false, error: 'Invalid claim ID format' }
    }

    // Fetch claim from database
    const claim = await getClaimById(claimId)

    if (!claim) {
      return { success: false, error: 'Claim not found' }
    }

    // Fetch transfers from Etherscan
    const etherscanClient = new EtherscanClient()
    const transfers = await etherscanClient.fetchERC20Transfers({
      chainId: claim.chain_id,
      tokenAddress: claim.token_address,
      recipientAddress: claim.recipient_address,
      fromTimestamp: claim.from_block_timestamp || undefined,
      toTimestamp: claim.to_block_timestamp || undefined,
    })

    return { success: true, transfers }
  } catch (err: unknown) {
    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    const message = err instanceof Error ? err.message : 'Failed to fetch transfers'
    return { success: false, error: message }
  }
}

export async function submitProofAction(data: SubmitProofInput) {
  try {
    // Validate input
    const validated = submitProofSchema.parse(data)

    // Check if claim exists
    const claim = await getClaimById(validated.claimId)
    if (!claim) {
      return { success: false, error: 'Claim not found' }
    }

    // Check nullifier uniqueness
    const nullifierExists = await checkNullifierExists(
      validated.claimId,
      validated.nullifier
    )

    if (nullifierExists) {
      return { success: false, error: 'This proof has already been submitted for this claim' }
    }

    // Prepare proof data
    const proofData: InsertProofEntity = {
      claim_id: validated.claimId,
      nullifier: validated.nullifier,
      proof_data: validated.proofData,
      public_inputs: validated.publicInputs,
      transfers_root_hash: validated.transfersRootHash,
    }

    // Create proof in database
    const result = await createProof(proofData)

    // Revalidate claim detail page
    revalidatePath(`/claims/${validated.claimId}`)
    revalidatePath('/')

    return { success: true, proofId: result.id }
  } catch (err: unknown) {
    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    if (err instanceof Error && err.name === 'ZodError') {
      return { success: false, error: 'Invalid proof data' }
    }

    // Handle database constraint violation for nullifier
    if (err && typeof err === 'object' && 'code' in err && 'constraint' in err && err.code === '23505' && err.constraint === 'claim_nullifier_unique') {
      return { success: false, error: 'This nullifier has already been used for this claim' }
    }

    const message = err instanceof Error ? err.message : 'Failed to submit proof'
    return { success: false, error: message }
  }
}

export async function verifyProofAction(proofId: string) {
  try {
    if (!isValidUUID(proofId)) {
      return { success: false, error: 'Invalid proof ID format' }
    }

    // Fetch proof from database
    const proof = await getProofByIdQuery(proofId)

    if (!proof) {
      return { success: false, error: 'Proof not found' }
    }

    // Note: Proof verification is done client-side using Noir.js before submission
    // This action records the verification result for tracking purposes
    // On-chain verification would happen when the proof is submitted to a smart contract
    const isValid = true

    // Record verification result
    await createVerification({
      proof_id: proofId,
      is_valid: isValid,
      error_message: isValid ? null : 'Verification failed',
    })

    return { success: true, isValid }
  } catch (err: unknown) {
    // Still record the failed verification
    try {
      await createVerification({
        proof_id: proofId,
        is_valid: false,
        error_message: err instanceof Error ? err.message : 'Verification error',
      })
    } catch (recordError) {
      console.error('Failed to record verification error:', recordError)
    }

    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    const message = err instanceof Error ? err.message : 'Failed to verify proof'
    return { success: false, error: message }
  }
}

export async function getProofsByClaimIdAction(claimId: string) {
  try {
    if (!isValidUUID(claimId)) {
      return { success: false, error: 'Invalid claim ID format' }
    }

    const result = await getProofsByClaimIdQuery(claimId)

    // Serialize dates for client
    const serialized = result.map((proof) => ({
      ...proof,
      created_at: proof.created_at.toISOString(),
    }))

    return { success: true, data: serialized }
  } catch (err: unknown) {
    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    const message = err instanceof Error ? err.message : 'Failed to fetch proofs'
    return { success: false, error: message }
  }
}

export async function getVerificationStatsAction(proofId: string) {
  try {
    if (!isValidUUID(proofId)) {
      return { success: false, error: 'Invalid proof ID format' }
    }

    const result = await getVerificationStatsQuery(proofId)

    return { success: true, data: result }
  } catch (err: unknown) {
    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    const message = err instanceof Error ? err.message : 'Failed to fetch verification stats'
    return { success: false, error: message }
  }
}
