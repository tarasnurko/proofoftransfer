import { db, getClient } from '../client'
import type { DB } from '../index.types'
import { proofVerificationsTable } from '../schema'
import type { InsertProofVerificationEntity, ProofVerificationEntity } from '../index.types'
import { eq, and, desc, count, sql } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../helpers'

export async function createVerification(data: InsertProofVerificationEntity, tx?: DB): Promise<ProofVerificationEntity> {
  return entityOrError(
    await getClient(tx)
      .insert(proofVerificationsTable)
      .values(data)
      .returning(),
    'Failed to create verification'
  )
}

export async function getVerificationStats(proofId: string) {
  const result = await db
    .select({
      total: count(),
      successful: sql<number>`count(case when ${proofVerificationsTable.isValid} = true then 1 end)`.mapWith(Number),
      failed: sql<number>`count(case when ${proofVerificationsTable.isValid} = false then 1 end)`.mapWith(Number),
    })
    .from(proofVerificationsTable)
    .where(eq(proofVerificationsTable.proofId, proofId))

  return {
    total: result[0]?.total ?? 0,
    successful: result[0]?.successful ?? 0,
    failed: result[0]?.failed ?? 0,
  }
}

interface ProofNullifierParams {
  proofId: string
  nullifier: string
}

export async function getVerificationByNullifier({ proofId, nullifier }: ProofNullifierParams) {
  return entityOrNull(
    await db
      .select()
      .from(proofVerificationsTable)
      .where(
        and(
          eq(proofVerificationsTable.proofId, proofId),
          eq(proofVerificationsTable.verifierNullifier, nullifier),
        )
      )
      .orderBy(desc(proofVerificationsTable.verifiedAt))
      .limit(1)
  )
}

export async function getSuccessfulVerificationByNullifier({ proofId, nullifier }: ProofNullifierParams) {
  return entityOrNull(
    await db
      .select()
      .from(proofVerificationsTable)
      .where(
        and(
          eq(proofVerificationsTable.proofId, proofId),
          eq(proofVerificationsTable.verifierNullifier, nullifier),
          eq(proofVerificationsTable.isValid, true)
        )
      )
      .limit(1)
  )
}

/**
 * Delete previous failed verifications for this nullifier+proof.
 * Called before each new verification attempt to ensure at most
 * one verification record per user per proof at any time.
 * This implements the "retry replaces, not accumulates" rule.
 */
export async function deleteFailedVerificationsByNullifier({ proofId, nullifier }: ProofNullifierParams, tx?: DB) {
  return getClient(tx)
    .delete(proofVerificationsTable)
    .where(
      and(
        eq(proofVerificationsTable.proofId, proofId),
        eq(proofVerificationsTable.verifierNullifier, nullifier),
        eq(proofVerificationsTable.isValid, false)
      )
    )
}

export async function getLatestVerification(proofId: string) {
  return entityOrNull(
    await db
      .select()
      .from(proofVerificationsTable)
      .where(eq(proofVerificationsTable.proofId, proofId))
      .orderBy(desc(proofVerificationsTable.verifiedAt))
      .limit(1)
  )
}
