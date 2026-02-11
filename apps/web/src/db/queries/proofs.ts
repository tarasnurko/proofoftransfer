import { db, type DB } from '../client'
import { proofsTable, claimsTable, proofVerificationsTable } from '../schema'
import type { InsertProofEntity, ProofEntity } from '../index.types'
import { eq, and, desc, asc, or, ilike, sql, count, type SQL } from 'drizzle-orm'
import { entityOrError, entityOrNull, getClient } from '../helpers'
import type { SortOrder } from '@/types'

export async function createProof(data: InsertProofEntity, tx?: DB): Promise<ProofEntity> {
  return entityOrError(
    await getClient(tx).insert(proofsTable).values(data).returning(),
    'Failed to create proof'
  )
}

const MAX_QUERY_LIMIT = 100

interface GetProofsByClaimIdParams {
  limit?: number
  offset?: number
  search?: string
  sortOrder?: SortOrder
}

export async function getProofsByClaimId(claimId: string, options?: GetProofsByClaimIdParams) {
  const limit = Math.min(options?.limit ?? 9, MAX_QUERY_LIMIT)
  const offset = Math.max(options?.offset ?? 0, 0)
  const sortFn = options?.sortOrder === 'asc' ? asc : desc

  const conditions: SQL[] = [eq(proofsTable.claimId, claimId)]

  if (options?.search) {
    const pattern = `%${options.search}%`
    const searchCondition = or(
      ilike(proofsTable.nullifier, pattern),
      sql`${proofsTable.id}::text ILIKE ${pattern}`,
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const whereClause = and(...conditions)

  const successfulCount = db.$count(
    proofVerificationsTable,
    and(eq(proofVerificationsTable.proofId, proofsTable.id), eq(proofVerificationsTable.isValid, true))
  )
  const failedCount = db.$count(
    proofVerificationsTable,
    and(eq(proofVerificationsTable.proofId, proofsTable.id), eq(proofVerificationsTable.isValid, false))
  )

  const result = await db
    .select({
      proof: proofsTable,
      successfulCount,
      failedCount,
    })
    .from(proofsTable)
    .where(whereClause)
    .orderBy(sortFn(proofsTable.createdAt))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ total: count() })
    .from(proofsTable)
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
      proof: proofsTable,
      claim: claimsTable,
    })
    .from(proofsTable)
    .innerJoin(claimsTable, eq(proofsTable.claimId, claimsTable.id))
    .where(eq(proofsTable.id, id))
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

interface CheckNullifierExistsParams {
  claimId: string
  nullifier: string
}

export async function checkNullifierExists({ claimId, nullifier }: CheckNullifierExistsParams): Promise<boolean> {
  const result = await db
    .select({ id: proofsTable.id })
    .from(proofsTable)
    .where(and(eq(proofsTable.claimId, claimId), eq(proofsTable.nullifier, nullifier)))
    .limit(1)

  return !!entityOrNull(result)
}
