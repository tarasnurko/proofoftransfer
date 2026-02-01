import { db } from '../index'
import { proof_verifications } from '../schema'
import type { NewProofVerification } from '../schema'
import { eq, desc, and, count, sql } from 'drizzle-orm'

export async function createVerification(data: NewProofVerification) {
  try {
    const [verification] = await db
      .insert(proof_verifications)
      .values(data)
      .returning()
    return { success: true, data: verification }
  } catch (error) {
    console.error('Error creating verification:', error)
    return { success: false, error: 'Failed to create verification' }
  }
}

export async function getVerificationsByProofId(proofId: string) {
  try {
    const verifications = await db
      .select()
      .from(proof_verifications)
      .where(eq(proof_verifications.proof_id, proofId))
      .orderBy(desc(proof_verifications.verified_at))

    return { success: true, data: verifications }
  } catch (error) {
    console.error('Error fetching verifications:', error)
    return { success: false, error: 'Failed to fetch verifications' }
  }
}

export async function getVerificationStats(proofId: string) {
  try {
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
      success: true,
      data: {
        total: stats ? Number(stats.total) : 0,
        successful: stats ? Number(stats.successful) : 0,
        failed: stats ? Number(stats.failed) : 0,
      },
    }
  } catch (error) {
    console.error('Error fetching verification stats:', error)
    return { success: false, error: 'Failed to fetch verification stats' }
  }
}

export async function getLatestVerification(proofId: string) {
  try {
    const [verification] = await db
      .select()
      .from(proof_verifications)
      .where(eq(proof_verifications.proof_id, proofId))
      .orderBy(desc(proof_verifications.verified_at))
      .limit(1)

    return { success: true, data: verification ?? null }
  } catch (error) {
    console.error('Error fetching latest verification:', error)
    return { success: false, error: 'Failed to fetch latest verification' }
  }
}
