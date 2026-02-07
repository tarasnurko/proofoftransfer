import { db, type DB } from '../client'
import { transfers } from '../schema'
import { claims } from '../schema'
import type { InsertTransferEntity, TransferEntity } from '../index.types'
import type { Nullable } from '@/types'
import { eq, and, gte, lte } from 'drizzle-orm'
import { entityOrNull } from '../helpers'

export async function bulkUpsertTransfers(
  transfersData: InsertTransferEntity[],
  tx?: DB
): Promise<TransferEntity[]> {
  if (!transfersData.length) {
    return []
  }

  const dbInstance = tx ?? db

  const result = await dbInstance
    .insert(transfers)
    .values(transfersData)
    .onConflictDoUpdate({
      target: [transfers.chainId, transfers.txHash, transfers.logIndex],
      set: { createdAt: transfers.createdAt },
    })
    .returning()

  return result
}

export async function getTransfersForClaim(
  claimId: string
): Promise<TransferEntity[]> {
  const claim = entityOrNull(
    await db.select().from(claims).where(eq(claims.id, claimId)).limit(1)
  )
  if (!claim) throw new Error('Claim not found')

  return getTransfersByConstraints({
    chainId: claim.chainId,
    tokenAddress: claim.tokenAddress,
    recipientAddress: claim.recipientAddress,
    fromTimestamp: claim.fromBlockTimestamp || undefined,
    toTimestamp: claim.toBlockTimestamp || undefined,
  })
}

interface GetTransfersByConstraintsParams {
  chainId: number
  tokenAddress: string
  recipientAddress: string
  fromTimestamp?: number
  toTimestamp?: number
}

export async function getTransfersByConstraints(
  params: GetTransfersByConstraintsParams
): Promise<TransferEntity[]> {
  const conditions = [
    eq(transfers.chainId, params.chainId),
    eq(transfers.tokenAddress, params.tokenAddress.toLowerCase()),
    eq(transfers.recipientAddress, params.recipientAddress.toLowerCase()),
  ]

  if (params.fromTimestamp) {
    conditions.push(gte(transfers.blockTimestamp, params.fromTimestamp))
  }
  if (params.toTimestamp) {
    conditions.push(lte(transfers.blockTimestamp, params.toTimestamp))
  }

  return db
    .select()
    .from(transfers)
    .where(and(...conditions))
    .orderBy(transfers.blockTimestamp)
}

export async function getTransferById(id: string): Promise<Nullable<TransferEntity>> {
  return entityOrNull(
    await db.select().from(transfers).where(eq(transfers.id, id)).limit(1)
  )
}
