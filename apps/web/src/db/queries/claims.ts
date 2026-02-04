import { db, type DB } from '../client'
import { claims, proofs, tokens } from '../schema'
import type { InsertClaimEntity, ClaimEntity } from '../index.types'
import { eq, desc, count, and } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '@/exceptions'

export async function createClaim(data: InsertClaimEntity, tx?: DB): Promise<ClaimEntity> {
  const dbInstance = tx ?? db
  return entityOrError(
    await dbInstance.insert(claims).values(data).returning(),
    'Failed to create claim'
  )
}

export async function getClaims(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0

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
    .groupBy(claims.id, tokens.id)
    .orderBy(desc(claims.createdAt))
    .limit(limit)
    .offset(offset)

  const totalResult = await db
    .select({ total: count(claims.id) })
    .from(claims)

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
