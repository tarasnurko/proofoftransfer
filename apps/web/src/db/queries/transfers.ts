import { db } from '../client'
import { transfers, claimTransfers } from '../schema'
import type { InsertTransferEntity, TransferEntity } from '../index.types'
import type { Nullable } from '@/types'
import { eq } from 'drizzle-orm'
import { entityOrNull } from '@/exceptions'

export async function bulkUpsertTransfers(
  transfersData: InsertTransferEntity[]
): Promise<TransferEntity[]> {
  if (!transfersData.length) {
    return []
  }

  const result = await db
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
  params: LinkTransfersToClaimParams
): Promise<void> {
  const { claimId, transferIds, merkleIndices } = params

  if (transferIds.length !== merkleIndices.length) {
    throw new Error('transferIds and merkleIndices must have same length')
  }

  if (!transferIds.length) {
    return
  }

  const data = transferIds.map((transferId, idx) => ({
    claimId,
    transferId,
    merkleLeafIndex: merkleIndices[idx]!,
  }))

  await db.insert(claimTransfers).values(data)
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

export async function getTransferById(id: string): Promise<Nullable<TransferEntity>> {
  return entityOrNull(
    await db.select().from(transfers).where(eq(transfers.id, id)).limit(1)
  )
}
