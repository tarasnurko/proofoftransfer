import { db } from '../index'
import { claims, proofs } from '../schema'
import type { NewClaim, Claim } from '../schema'
import { eq, desc, count, sql } from 'drizzle-orm'

export async function createClaim(data: NewClaim) {
  try {
    const [claim] = await db.insert(claims).values(data).returning()
    return { success: true, data: claim }
  } catch (error) {
    console.error('Error creating claim:', error)
    return { success: false, error: 'Failed to create claim' }
  }
}

export async function getClaims(options?: { limit?: number; offset?: number }) {
  try {
    const limit = options?.limit ?? 50
    const offset = options?.offset ?? 0

    // Get claims with proof count
    const result = await db
      .select({
        claim: claims,
        proofCount: count(proofs.id).as('proof_count'),
      })
      .from(claims)
      .leftJoin(proofs, eq(claims.id, proofs.claim_id))
      .groupBy(claims.id)
      .orderBy(desc(claims.created_at))
      .limit(limit)
      .offset(offset)

    // Get total count
    const totalResult = await db
      .select({ total: count(claims.id) })
      .from(claims)

    const total = totalResult[0]?.total ?? 0

    return {
      success: true,
      data: {
        claims: result.map((r) => ({
          ...r.claim,
          proofCount: Number(r.proofCount),
        })),
        total: Number(total),
      },
    }
  } catch (error) {
    console.error('Error fetching claims:', error)
    return { success: false, error: 'Failed to fetch claims' }
  }
}

export async function getClaimById(id: string) {
  try {
    const result = await db
      .select({
        claim: claims,
        proofCount: count(proofs.id).as('proof_count'),
      })
      .from(claims)
      .leftJoin(proofs, eq(claims.id, proofs.claim_id))
      .where(eq(claims.id, id))
      .groupBy(claims.id)
      .limit(1)

    if (result.length === 0) {
      return { success: true, data: null }
    }

    const firstResult = result[0]
    if (!firstResult) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: {
        ...firstResult.claim,
        proofCount: Number(firstResult.proofCount),
      },
    }
  } catch (error) {
    console.error('Error fetching claim by id:', error)
    return { success: false, error: 'Failed to fetch claim' }
  }
}

export async function getClaimByMessageHash(messageHash: string) {
  try {
    const [claim] = await db
      .select()
      .from(claims)
      .where(eq(claims.message_hash, messageHash))
      .limit(1)

    return { success: true, data: claim ?? null }
  } catch (error) {
    console.error('Error fetching claim by message hash:', error)
    return { success: false, error: 'Failed to fetch claim' }
  }
}

export async function getClaimsByCreator(creatorAddress: string) {
  try {
    const result = await db
      .select({
        claim: claims,
        proofCount: count(proofs.id).as('proof_count'),
      })
      .from(claims)
      .leftJoin(proofs, eq(claims.id, proofs.claim_id))
      .where(eq(claims.creator_address, creatorAddress.toLowerCase()))
      .groupBy(claims.id)
      .orderBy(desc(claims.created_at))

    return {
      success: true,
      data: result.map((r) => ({
        ...r.claim,
        proofCount: Number(r.proofCount),
      })),
    }
  } catch (error) {
    console.error('Error fetching claims by creator:', error)
    return { success: false, error: 'Failed to fetch claims' }
  }
}
