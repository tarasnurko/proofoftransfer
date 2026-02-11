import { db, type DB } from '../client'
import { transfersTable, claimsTable } from '../schema'
import type { InsertTransferEntity, TransferEntity } from '../index.types'
import type { Nullable } from '@/types'
import { eq, and, gte, lte } from 'drizzle-orm'
import { entityOrNull, getClient } from '../helpers'

export async function upsertTransfers(
  transfersData: InsertTransferEntity[],
  tx?: DB
): Promise<TransferEntity[]> {
  if (!transfersData.length) {
    return []
  }

  return getClient(tx)
    .insert(transfersTable)
    .values(transfersData)
    .onConflictDoUpdate({
      target: [transfersTable.chainId, transfersTable.txHash, transfersTable.logIndex],
      set: { createdAt: transfersTable.createdAt },
    })
    .returning()
}

export async function getTransfersForClaim(
  claimId: string
): Promise<TransferEntity[]> {
  const claim = entityOrNull(
    await db.select().from(claimsTable).where(eq(claimsTable.id, claimId)).limit(1)
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
    eq(transfersTable.chainId, params.chainId),
    eq(transfersTable.tokenAddress, params.tokenAddress.toLowerCase()),
    eq(transfersTable.recipientAddress, params.recipientAddress.toLowerCase()),
  ]

  if (params.fromTimestamp) {
    conditions.push(gte(transfersTable.blockTimestamp, params.fromTimestamp))
  }
  if (params.toTimestamp) {
    conditions.push(lte(transfersTable.blockTimestamp, params.toTimestamp))
  }

  return db
    .select()
    .from(transfersTable)
    .where(and(...conditions))
    .orderBy(transfersTable.blockTimestamp)
}

export async function getTransferById(id: string): Promise<Nullable<TransferEntity>> {
  return entityOrNull(
    await db.select().from(transfersTable).where(eq(transfersTable.id, id)).limit(1)
  )
}
