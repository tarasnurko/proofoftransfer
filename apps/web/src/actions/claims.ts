'use server'

import { revalidatePath } from 'next/cache'
import { keccak256, toBytes } from 'viem'
import { createClaimSchema, transformClaimFormData, type CreateClaimInput } from '@/lib/validations/claim'
import { createClaim, getClaims as getClaimsQuery, getClaimById as getClaimByIdQuery } from '@/db/queries/claims'
import type { NewClaim } from '@/db/schema'
import { fetchAndStoreTokenDataAction } from './tokens'

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
    const claimData: NewClaim = {
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

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to create claim' }
    }

    // Revalidate homepage to show new claim
    revalidatePath('/')

    return { success: true, claimId: result.data.id }
  } catch (error: any) {
    console.error('Error in createClaimAction:', error)

    if (error.name === 'ZodError') {
      return { success: false, error: 'Invalid input data' }
    }

    return { success: false, error: error.message || 'Failed to create claim' }
  }
}

export async function getClaimsAction() {
  try {
    const result = await getClaimsQuery({ limit: 50, offset: 0 })

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to fetch claims' }
    }

    // Serialize dates for client
    const serialized = result.data.claims.map((claim) => ({
      ...claim,
      created_at: claim.created_at.toISOString(),
    }))

    return { success: true, data: serialized, total: result.data.total }
  } catch (error: any) {
    console.error('Error in getClaimsAction:', error)
    return { success: false, error: 'Failed to fetch claims' }
  }
}

export async function getClaimByIdAction(id: string) {
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return { success: false, error: 'Invalid claim ID format' }
    }

    const result = await getClaimByIdQuery(id)

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to fetch claim' }
    }

    if (!result.data) {
      return { success: true, data: null }
    }

    // Serialize date for client
    const serialized = {
      ...result.data,
      created_at: result.data.created_at.toISOString(),
    }

    return { success: true, data: serialized }
  } catch (error: any) {
    console.error('Error in getClaimByIdAction:', error)
    return { success: false, error: 'Failed to fetch claim' }
  }
}
