import { db, type DB } from '../client'
import { claims, proofs, tokens } from '../schema'
import type { InsertClaimEntity, ClaimEntity } from '../index.types'
import { eq, desc, asc, count, and, or, ilike, sql, type SQL } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../helpers'
import type { ClaimsSortBy } from '@/constants'
import type { SortOrder } from '@/types'

export async function createClaim(data: InsertClaimEntity, tx?: DB): Promise<ClaimEntity> {
  const dbInstance = tx ?? db
  return entityOrError(
    await dbInstance.insert(claims).values(data).returning(),
    'Failed to create claim'
  )
}

const MAX_QUERY_LIMIT = 100

interface GetClaimsOptions {
  limit?: number
  offset?: number
  search?: string
  chainId?: number
  sortBy?: ClaimsSortBy
  sortOrder?: SortOrder
}

export async function getClaims(options?: GetClaimsOptions) {
  const limit = Math.min(options?.limit ?? 10, MAX_QUERY_LIMIT)
  const offset = Math.max(options?.offset ?? 0, 0)

  const conditions: SQL[] = []

  if (options?.chainId) {
    conditions.push(eq(claims.chainId, options.chainId))
  }

  if (options?.search) {
    const pattern = `%${options.search}%`
    const searchCondition = or(
      ilike(claims.message, pattern),
      ilike(claims.recipientAddress, pattern),
      ilike(claims.tokenAddress, pattern),
      ilike(claims.messageHash, pattern),
      sql`${claims.id}::text ILIKE ${pattern}`,
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const whereClause = conditions.length ? and(...conditions) : undefined

  const sortFn = options?.sortOrder === 'asc' ? asc : desc
  const orderByClause = options?.sortBy === 'proofCount'
    ? sortFn(count(proofs.id))
    : sortFn(claims.createdAt)

  const result = await db
    .select({
      claim: claims,
      proofCount: count(proofs.id),
      token: tokens,
    })
    .from(claims)
    .leftJoin(proofs, eq(claims.id, proofs.claimId))
    .leftJoin(
      tokens,
      and(eq(claims.tokenAddress, tokens.address), eq(claims.chainId, tokens.chainId))
    )
    .where(whereClause)
    .groupBy(claims.id, tokens.id)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset)

  const totalQuery = db.select({ total: count(claims.id) }).from(claims)
  const totalResult = whereClause
    ? await totalQuery.where(whereClause)
    : await totalQuery

  const total = totalResult[0]?.total ?? 0

  return {
    claims: result.map((r) => ({
      ...r.claim,
      proofCount: Number(r.proofCount),
      token: r.token,
    })),
    total: Number(total),
  }
}

export async function getClaimById(id: string) {
  const result = await db
    .select({
      claim: claims,
      proofCount: count(proofs.id),
      token: tokens,
    })
    .from(claims)
    .leftJoin(proofs, eq(claims.id, proofs.claimId))
    .leftJoin(
      tokens,
      and(eq(claims.tokenAddress, tokens.address), eq(claims.chainId, tokens.chainId))
    )
    .where(eq(claims.id, id))
    .groupBy(claims.id, tokens.id)
    .limit(1)

  const claimResult = entityOrNull(result)

  if (!claimResult) {
    return null
  }

  return {
    ...claimResult.claim,
    proofCount: Number(claimResult.proofCount),
    token: claimResult.token,
  }
}

export async function getClaimByMessageHash(messageHash: string) {
  return entityOrNull(
    await db
      .select()
      .from(claims)
      .where(eq(claims.messageHash, messageHash))
      .limit(1)
  )
}

export async function updateClaimMerkleRoot(
  claimId: string,
  merkleRoot: string,
  tx?: DB
): Promise<void> {
  const dbInstance = tx ?? db
  await dbInstance.update(claims).set({ merkleRoot }).where(eq(claims.id, claimId))
}
