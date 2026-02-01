import { db } from '../index'
import { proof_verifications } from '../schema'
import type { InsertProofVerificationEntity, ProofVerificationEntity } from '../index.types'
import { eq, desc, count, sql } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../exceptions'

export async function createVerification(data: InsertProofVerificationEntity): Promise<ProofVerificationEntity> {
  return entityOrError(
    await db
      .insert(proof_verifications)
      .values(data)
      .returning(),
    'Failed to create verification'
  )
}

export async function getVerificationsByProofId(proofId: string) {
  return db
    .select()
    .from(proof_verifications)
    .where(eq(proof_verifications.proof_id, proofId))
    .orderBy(desc(proof_verifications.verified_at))
}

export async function getVerificationStats(proofId: string) {
  const statsResult = await db
    .select({
      total: count(proof_verifications.id).as('total'),
      successful: count(
        sql`CASE WHEN ${proof_verifications.is_valid} = true THEN 1 END`
      ).as('successful'),
      failed: count(
        sql`CASE WHEN ${proof_verifications.is_valid} = false THEN 1 END`
      ).as('failed'),
    })
    .from(proof_verifications)
    .where(eq(proof_verifications.proof_id, proofId))

  const stats = statsResult[0]

  return {
    total: stats ? Number(stats.total) : 0,
    successful: stats ? Number(stats.successful) : 0,
    failed: stats ? Number(stats.failed) : 0,
  }
}

export async function getLatestVerification(proofId: string) {
  return entityOrNull(
    await db
      .select()
      .from(proof_verifications)
      .where(eq(proof_verifications.proof_id, proofId))
      .orderBy(desc(proof_verifications.verified_at))
      .limit(1)
  )
}
