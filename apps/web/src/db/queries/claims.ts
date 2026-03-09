import { cache } from 'react'
import { db, getClient } from '../client'
import type { DB } from '../index.types'
import { claimsTable, proofsTable, tokensTable } from '../schema'
import type { InsertClaimEntity, ClaimEntity } from '../index.types'
import { eq, desc, asc, count, and, or, ilike, sql, type SQL } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../helpers'
import type { ClaimsSortBy } from '@/constants'
import type { SortOrder } from '@/types'

export async function createClaim(data: InsertClaimEntity, tx?: DB): Promise<ClaimEntity> {
  return entityOrError(
    await getClient(tx).insert(claimsTable).values(data).returning(),
    'Failed to create claim'
  )
}

const MAX_QUERY_LIMIT = 100

interface GetClaimsParams {
  limit?: number
  offset?: number
  search?: string
  chainId?: number
  sortBy?: ClaimsSortBy
  sortOrder?: SortOrder
}

export async function getClaims(options?: GetClaimsParams) {
  const limit = Math.min(options?.limit ?? 10, MAX_QUERY_LIMIT)
  const offset = Math.max(options?.offset ?? 0, 0)

  const conditions: SQL[] = []

  if (options?.chainId) {
    conditions.push(eq(claimsTable.chainId, options.chainId))
  }

  if (options?.search) {
    const pattern = `%${options.search}%`
    const searchCondition = or(
      ilike(claimsTable.message, pattern),
      ilike(claimsTable.counterpartyAddress, pattern),
      ilike(claimsTable.tokenAddress, pattern),
      ilike(claimsTable.messageHash, pattern),
      sql`${claimsTable.id}::text ILIKE ${pattern}`,
    )
    if (searchCondition) conditions.push(searchCondition)
  }

  const whereClause = conditions.length ? and(...conditions) : undefined

  const proofCount = db.$count(proofsTable, eq(proofsTable.claimId, claimsTable.id))
  const sortFn = options?.sortOrder === 'asc' ? asc : desc
  const orderByClause = options?.sortBy === 'proofCount'
    ? sortFn(proofCount)
    : sortFn(claimsTable.createdAt)

  const result = await db
    .select({
      claim: claimsTable,
      proofCount,
      token: tokensTable,
    })
    .from(claimsTable)
    .leftJoin(
      tokensTable,
      and(eq(claimsTable.tokenAddress, tokensTable.address), eq(claimsTable.chainId, tokensTable.chainId))
    )
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ total: count() })
    .from(claimsTable)
    .where(whereClause)

  return {
    claims: result.map((row) => ({
      ...row.claim,
      proofCount: row.proofCount,
      token: row.token,
    })),
    total: totalResult[0]?.total ?? 0,
  }
}

export const getClaimById = cache(async function getClaimById(id: string) {
  const result = await db
    .select({
      claim: claimsTable,
      proofCount: db.$count(proofsTable, eq(proofsTable.claimId, claimsTable.id)),
      token: tokensTable,
    })
    .from(claimsTable)
    .leftJoin(
      tokensTable,
      and(eq(claimsTable.tokenAddress, tokensTable.address), eq(claimsTable.chainId, tokensTable.chainId))
    )
    .where(eq(claimsTable.id, id))
    .limit(1)

  const claimResult = entityOrNull(result)

  if (!claimResult) {
    return null
  }

  return {
    ...claimResult.claim,
    proofCount: claimResult.proofCount,
    token: claimResult.token,
  }
})

export async function getClaimByMessageHash(messageHash: string) {
  return entityOrNull(
    await db
      .select()
      .from(claimsTable)
      .where(eq(claimsTable.messageHash, messageHash))
      .limit(1)
  )
}
