import { db } from '../index'
import { proofs, claims, proof_verifications } from '../schema'
import type { NewProof, Proof } from '../schema'
import { eq, and, desc, count } from 'drizzle-orm'

export async function createProof(data: NewProof) {
  try {
    const [proof] = await db.insert(proofs).values(data).returning()
    return { success: true, data: proof }
  } catch (error: any) {
    // Check for unique constraint violation
    if (error?.code === '23505' && error?.constraint === 'claim_nullifier_unique') {
      return { success: false, error: 'This nullifier has already been used for this claim' }
    }
    console.error('Error creating proof:', error)
    return { success: false, error: 'Failed to create proof' }
  }
}

export async function getProofsByClaimId(claimId: string) {
  try {
    const result = await db
      .select({
        proof: proofs,
        verificationCount: count(proof_verifications.id).as('verification_count'),
      })
      .from(proofs)
      .leftJoin(proof_verifications, eq(proofs.id, proof_verifications.proof_id))
      .where(eq(proofs.claim_id, claimId))
      .groupBy(proofs.id)
      .orderBy(desc(proofs.created_at))

    return {
      success: true,
      data: result.map((r) => ({
        ...r.proof,
        verificationCount: Number(r.verificationCount),
      })),
    }
  } catch (error) {
    console.error('Error fetching proofs by claim id:', error)
    return { success: false, error: 'Failed to fetch proofs' }
  }
}

export async function getProofById(id: string) {
  try {
    const result = await db
      .select({
        proof: proofs,
        claim: claims,
      })
      .from(proofs)
      .innerJoin(claims, eq(proofs.claim_id, claims.id))
      .where(eq(proofs.id, id))
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
        ...firstResult.proof,
        claim: firstResult.claim,
      },
    }
  } catch (error) {
    console.error('Error fetching proof by id:', error)
    return { success: false, error: 'Failed to fetch proof' }
  }
}

export async function checkNullifierExists(claimId: string, nullifier: string) {
  try {
    const [result] = await db
      .select({ id: proofs.id })
      .from(proofs)
      .where(and(eq(proofs.claim_id, claimId), eq(proofs.nullifier, nullifier)))
      .limit(1)

    return { success: true, data: !!result }
  } catch (error) {
    console.error('Error checking nullifier:', error)
    return { success: false, error: 'Failed to check nullifier' }
  }
}
