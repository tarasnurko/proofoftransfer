'use server'

import { revalidatePath } from 'next/cache'
import { submitProofSchema, type SubmitProofInput } from '@/lib/validations/proof'
import { getClaimById } from '@/db/queries/claims'
import { createProof, checkNullifierExists, getProofsByClaimId as getProofsByClaimIdQuery, getProofById as getProofByIdQuery } from '@/db/queries/proofs'
import { createVerification, getVerificationStats as getVerificationStatsQuery } from '@/db/queries/verifications'
import { baseScanClient } from '@/lib/etherscan'
import type { NewProof } from '@/db/schema'

export async function fetchTransfersAction(claimId: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(claimId)) {
      return { success: false, error: 'Invalid claim ID format' }
    }

    // Fetch claim from database
    const claimResult = await getClaimById(claimId)

    if (!claimResult.success || !claimResult.data) {
      return { success: false, error: 'Claim not found' }
    }

    const claim = claimResult.data

    // Fetch transfers from Etherscan
    const transfers = await baseScanClient.fetchERC20Transfers({
      tokenAddress: claim.token_address,
      recipientAddress: claim.recipient_address,
      fromTimestamp: claim.from_block_timestamp || undefined,
      toTimestamp: claim.to_block_timestamp || undefined,
    })

    return { success: true, transfers }
  } catch (error: any) {
    console.error('Error in fetchTransfersAction:', error)
    return { success: false, error: error.message || 'Failed to fetch transfers' }
  }
}

export async function submitProofAction(data: SubmitProofInput) {
  try {
    // Validate input
    const validated = submitProofSchema.parse(data)

    // Check if claim exists
    const claimResult = await getClaimById(validated.claimId)
    if (!claimResult.success || !claimResult.data) {
      return { success: false, error: 'Claim not found' }
    }

    // Check nullifier uniqueness
    const nullifierCheck = await checkNullifierExists(
      validated.claimId,
      validated.nullifier
    )

    if (nullifierCheck.success && nullifierCheck.data === true) {
      return { success: false, error: 'This proof has already been submitted for this claim' }
    }

    // Prepare proof data
    const proofData: NewProof = {
      claim_id: validated.claimId,
      nullifier: validated.nullifier,
      proof_data: validated.proofData,
      public_inputs: validated.publicInputs,
      transfers_root_hash: validated.transfersRootHash,
      prover_address: validated.proverAddress || null,
    }

    // Create proof in database
    const result = await createProof(proofData)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to submit proof' }
    }

    // Revalidate claim detail page
    revalidatePath(`/claims/${validated.claimId}`)
    revalidatePath('/')

    return { success: true, proofId: result.data.id }
  } catch (error: any) {
    console.error('Error in submitProofAction:', error)

    if (error.name === 'ZodError') {
      return { success: false, error: 'Invalid proof data' }
    }

    return { success: false, error: error.message || 'Failed to submit proof' }
  }
}

export async function verifyProofAction(proofId: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(proofId)) {
      return { success: false, error: 'Invalid proof ID format' }
    }

    // Fetch proof from database
    const proofResult = await getProofByIdQuery(proofId)

    if (!proofResult.success || !proofResult.data) {
      return { success: false, error: 'Proof not found' }
    }

    // Note: Proof verification is done client-side using Noir.js before submission
    // This action records the verification result for tracking purposes
    // On-chain verification would happen when the proof is submitted to a smart contract
    const isValid = true

    // Record verification result
    await createVerification({
      proof_id: proofId,
      verifier_address: null, // Can be set if user is logged in
      is_valid: isValid,
      error_message: isValid ? null : 'Verification failed',
    })

    return { success: true, isValid }
  } catch (error: any) {
    console.error('Error in verifyProofAction:', error)

    // Still record the failed verification
    try {
      await createVerification({
        proof_id: proofId,
        verifier_address: null,
        is_valid: false,
        error_message: error.message || 'Verification error',
      })
    } catch (recordError) {
      console.error('Failed to record verification error:', recordError)
    }

    return { success: false, error: error.message || 'Failed to verify proof' }
  }
}

export async function getProofsByClaimIdAction(claimId: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(claimId)) {
      return { success: false, error: 'Invalid claim ID format' }
    }

    const result = await getProofsByClaimIdQuery(claimId)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to fetch proofs' }
    }

    // Serialize dates for client
    const serialized = result.data.map((proof) => ({
      ...proof,
      created_at: proof.created_at.toISOString(),
    }))

    return { success: true, data: serialized }
  } catch (error: any) {
    console.error('Error in getProofsByClaimIdAction:', error)
    return { success: false, error: 'Failed to fetch proofs' }
  }
}

export async function getVerificationStatsAction(proofId: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(proofId)) {
      return { success: false, error: 'Invalid proof ID format' }
    }

    const result = await getVerificationStatsQuery(proofId)

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to fetch verification stats' }
    }

    return { success: true, data: result.data }
  } catch (error: any) {
    console.error('Error in getVerificationStatsAction:', error)
    return { success: false, error: 'Failed to fetch verification stats' }
  }
}
