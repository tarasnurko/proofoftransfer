import { db } from '../index'
import { proofs, claims, proof_verifications } from '../schema'
import type { InsertProofEntity, ProofEntity } from '../index.types'
import { eq, and, desc, count } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../exceptions'

export async function createProof(data: InsertProofEntity): Promise<ProofEntity> {
  return entityOrError(
    await db.insert(proofs).values(data).returning(),
    'Failed to create proof'
  )
}

export async function getProofsByClaimId(claimId: string) {
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

  return result.map((r) => ({
    ...r.proof,
    verificationCount: Number(r.verificationCount),
  }))
}

export async function getProofById(id: string) {
  const result = await db
    .select({
      proof: proofs,
      claim: claims,
    })
    .from(proofs)
    .innerJoin(claims, eq(proofs.claim_id, claims.id))
    .where(eq(proofs.id, id))
    .limit(1)

  const proofResult = entityOrNull(result)

  if (!proofResult) {
    return null
  }

  return {
    ...proofResult.proof,
    claim: proofResult.claim,
  }
}

export async function checkNullifierExists(claimId: string, nullifier: string): Promise<boolean> {
  const result = await db
    .select({ id: proofs.id })
    .from(proofs)
    .where(and(eq(proofs.claim_id, claimId), eq(proofs.nullifier, nullifier)))
    .limit(1)

  return !!entityOrNull(result)
}
