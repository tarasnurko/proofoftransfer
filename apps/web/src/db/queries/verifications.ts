import { db } from '../client'
import { proofVerifications } from '../schema'
import type { InsertProofVerificationEntity, ProofVerificationEntity } from '../index.types'
import { eq, and, desc, count } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../helpers'

export async function createVerification(data: InsertProofVerificationEntity): Promise<ProofVerificationEntity> {
  return entityOrError(
    await db
      .insert(proofVerifications)
      .values(data)
      .returning(),
    'Failed to create verification'
  )
}

export async function getVerificationsByProofId(proofId: string) {
  return db
    .select()
    .from(proofVerifications)
    .where(eq(proofVerifications.proofId, proofId))
    .orderBy(desc(proofVerifications.verifiedAt))
}

export async function getVerificationStats(proofId: string) {
  const [totalResult, successfulResult, failedResult] = await Promise.all([
    db
      .select({ count: count() })
      .from(proofVerifications)
      .where(eq(proofVerifications.proofId, proofId)),
    db
      .select({ count: count() })
      .from(proofVerifications)
      .where(and(eq(proofVerifications.proofId, proofId), eq(proofVerifications.isValid, true))),
    db
      .select({ count: count() })
      .from(proofVerifications)
      .where(and(eq(proofVerifications.proofId, proofId), eq(proofVerifications.isValid, false))),
  ])

  return {
    total: totalResult[0]?.count ?? 0,
    successful: successfulResult[0]?.count ?? 0,
    failed: failedResult[0]?.count ?? 0,
  }
}

export async function getLatestVerification(proofId: string) {
  return entityOrNull(
    await db
      .select()
      .from(proofVerifications)
      .where(eq(proofVerifications.proofId, proofId))
      .orderBy(desc(proofVerifications.verifiedAt))
      .limit(1)
  )
}
