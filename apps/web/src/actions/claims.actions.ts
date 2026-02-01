'use server'

import { revalidatePath } from 'next/cache'
import { keccak256, toBytes } from 'viem'
import { createClaimSchema, transformClaimFormData, type CreateClaimInput } from '@/lib/validations/claim'
import { createClaim, getClaims as getClaimsQuery, getClaimById as getClaimByIdQuery } from '@/db/queries/claims'
import type { InsertClaimEntity } from '@/db/index.types'
import { fetchAndStoreTokenDataAction } from './tokens.actions'
import { isValidUUID } from '@/utils/validation'
import { EntityNotFoundException } from '@/db/exceptions'

export async function createClaimAction(data: CreateClaimInput) {
  try {
    // Validate input
    const validated = createClaimSchema.parse(data)

    // Transform form data to database format
    const transformed = transformClaimFormData(validated)

    // Compute message hash using keccak256 for database indexing
    // Note: Circuit uses Poseidon2 hash computed during proof generation
    const message_hash = keccak256(toBytes(validated.claimMessage))

    // Prepare claim data
    const claimData: InsertClaimEntity = {
      message: transformed.message,
      message_hash,
      token_address: transformed.token_address,
      recipient_address: transformed.recipient_address,
      min_transfers_sum: transformed.min_transfers_sum,
      max_transfers_sum: transformed.max_transfers_sum,
      from_block_timestamp: transformed.from_block_timestamp,
      to_block_timestamp: transformed.to_block_timestamp,
      chain_id: transformed.chain_id,
    }

    // Fetch and store token data
    await fetchAndStoreTokenDataAction(
      transformed.token_address,
      transformed.chain_id,
      transformed.recipient_address,
      transformed.from_block_timestamp || undefined,
      transformed.to_block_timestamp || undefined
    )

    // Create claim in database
    const result = await createClaim(claimData)

    // Revalidate homepage to show new claim
    revalidatePath('/')

    return { success: true, claimId: result.id }
  } catch (err: unknown) {
    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    if (err instanceof Error && err.name === 'ZodError') {
      return { success: false, error: 'Invalid input data' }
    }

    const message = err instanceof Error ? err.message : 'Failed to create claim'
    return { success: false, error: message }
  }
}

export async function getClaimsAction() {
  try {
    const result = await getClaimsQuery({ limit: 50, offset: 0 })

    // Serialize dates for client
    const serialized = result.claims.map((claim) => ({
      ...claim,
      created_at: claim.created_at.toISOString(),
    }))

    return { success: true, data: serialized, total: result.total }
  } catch (err: unknown) {
    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    const message = err instanceof Error ? err.message : 'Failed to fetch claims'
    return { success: false, error: message }
  }
}

export async function getClaimByIdAction(id: string) {
  try {
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid claim ID format' }
    }

    const result = await getClaimByIdQuery(id)

    if (!result) {
      return { success: true, data: null }
    }

    // Serialize date for client
    const serialized = {
      ...result,
      created_at: result.created_at.toISOString(),
    }

    return { success: true, data: serialized }
  } catch (err: unknown) {
    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    const message = err instanceof Error ? err.message : 'Failed to fetch claim'
    return { success: false, error: message }
  }
}
