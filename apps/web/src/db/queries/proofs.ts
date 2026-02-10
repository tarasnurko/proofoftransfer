import { db } from '../client'
import { proofs, claims, proofVerifications } from '../schema'
import type { InsertProofEntity, ProofEntity } from '../index.types'
import { eq, and, desc, asc, or, ilike, sql, count, type SQL } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../helpers'
import type { SortOrder } from '@/types'

export async function createProof(data: InsertProofEntity): Promise<ProofEntity> {
  return entityOrError(
    await db.insert(proofs).values(data).returning(),
    'Failed to create proof'
  )
}

const MAX_QUERY_LIMIT = 100

interface GetProofsOptions {
  limit?: number
  offset?: number
  search?: string
  sortOrder?: SortOrder
}

export async function getProofsByClaimId(claimId: string, options?: GetProofsOptions) {
  const limit = Math.min(options?.limit ?? 9, MAX_QUERY_LIMIT)
  const offset = Math.max(options?.offset ?? 0, 0)
  const sortFn = options?.sortOrder === 'asc' ? asc : desc

  const conditions: SQL[] = [eq(proofs.claimId, claimId)]

  if (options?.search) {
    const pattern = `%${options.search}%`
    const searchCondition = or(
      ilike(proofs.nullifier, pattern),
      sql`${proofs.id}::text ILIKE ${pattern}`,
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const whereClause = and(...conditions)

  const result = await db
    .select({
      proof: proofs,
      successfulCount: sql<number>`count(case when ${proofVerifications.isValid} = true then 1 end)`.mapWith(Number),
      failedCount: sql<number>`count(case when ${proofVerifications.isValid} = false then 1 end)`.mapWith(Number),
    })
    .from(proofs)
    .leftJoin(proofVerifications, eq(proofs.id, proofVerifications.proofId))
    .where(whereClause)
    .groupBy(proofs.id)
    .orderBy(sortFn(proofs.createdAt))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ total: count(proofs.id) })
    .from(proofs)
    .where(whereClause)

  return {
    proofs: result.map((r) => ({
      ...r.proof,
      verificationStats: {
        successful: r.successfulCount,
        failed: r.failedCount,
      },
    })),
    total: totalResult[0]?.total ?? 0,
  }
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

