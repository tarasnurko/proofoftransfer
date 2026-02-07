import { db } from '../client'
import { proofs, claims, proofVerifications } from '../schema'
import type { InsertProofEntity, ProofEntity } from '../index.types'
import { eq, and, desc, sql } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../helpers'

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
      successfulCount: sql<number>`count(case when ${proofVerifications.isValid} = true then 1 end)`.mapWith(Number),
      failedCount: sql<number>`count(case when ${proofVerifications.isValid} = false then 1 end)`.mapWith(Number),
    })
    .from(proofs)
    .leftJoin(proofVerifications, eq(proofs.id, proofVerifications.proofId))
    .where(eq(proofs.claimId, claimId))
    .groupBy(proofs.id)
    .orderBy(desc(proofs.createdAt))

  return result.map((r) => ({
    ...r.proof,
    verificationStats: {
      successful: r.successfulCount,
      failed: r.failedCount,
    },
  }))
}

export async function getProofById(id: string) {
  const result = await db
    .select({
      proof: proofs,
      claim: claims,
    })
    .from(proofs)
    .innerJoin(claims, eq(proofs.claimId, claims.id))
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
    .where(and(eq(proofs.claimId, claimId), eq(proofs.nullifier, nullifier)))
    .limit(1)

  return !!entityOrNull(result)
}

export async function getProofsByNullifier(nullifier: string) {
  const result = await db
    .select({
      proof: proofs,
      claim: claims,
    })
    .from(proofs)
    .innerJoin(claims, eq(proofs.claimId, claims.id))
    .where(eq(proofs.nullifier, nullifier))
    .orderBy(desc(proofs.createdAt))

  return result.map((r) => ({
    ...r.proof,
    claim: r.claim,
  }))
}
