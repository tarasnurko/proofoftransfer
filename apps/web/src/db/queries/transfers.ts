import { db, type DB } from '../client'
import { transfers, claimTransfers } from '../schema'
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

interface LinkTransfersToClaimParams {
  claimId: string
  transferIds: string[]
  merkleIndices: number[]
}

export async function linkTransfersToClaim(
  params: LinkTransfersToClaimParams,
  tx?: DB
): Promise<void> {
  const { claimId, transferIds, merkleIndices } = params

  if (transferIds.length !== merkleIndices.length) {
    throw new Error('transferIds and merkleIndices must have same length')
  }

  if (!transferIds.length) {
    return
  }

  const dbInstance = tx ?? db

  const data = transferIds.map((transferId, idx) => ({
    claimId,
    transferId,
    merkleLeafIndex: merkleIndices[idx]!,
  }))

  await dbInstance.insert(claimTransfers).values(data)
}

export async function getTransfersForClaim(
  claimId: string
): Promise<Array<{ transfers: TransferEntity; claim_transfers: typeof claimTransfers.$inferSelect }>> {
  const result = await db
    .select()
    .from(transfers)
    .innerJoin(claimTransfers, eq(transfers.id, claimTransfers.transferId))
    .where(eq(claimTransfers.claimId, claimId))
    .orderBy(claimTransfers.merkleLeafIndex)

  return result
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
