import { type DB } from '../client'
import { erc20TransfersTable, erc721TransfersTable, erc1155TransfersTable } from '../schema'
import type {
  Erc20TransferEntity,
  InsertErc20TransferEntity,
  Erc721TransferEntity,
  InsertErc721TransferEntity,
  Erc1155TransferEntity,
  InsertErc1155TransferEntity,
  TransferEntity,
} from '../index.types'
import { eq, and, gte, lte } from 'drizzle-orm'
import { getClient } from '../helpers'
import { TokenType } from '@repo/types'

const DEFAULT_TRANSFERS_LIMIT = 5000

// ─── Params ─────────────────────────────────────────────────

export interface GetTransfersParams {
  chainId: number
  tokenAddress: string
  senderAddress?: string
  recipientAddress?: string
  fromTimestamp?: number
  toTimestamp?: number
  limit?: number
  offset?: number
}

// ─── Select ─────────────────────────────────────────────────

export async function getErc20Transfers(
  params: GetTransfersParams,
  tx?: DB
): Promise<Erc20TransferEntity[]> {
  const t = erc20TransfersTable
  const conditions = [
    eq(t.chainId, params.chainId),
    eq(t.tokenAddress, params.tokenAddress.toLowerCase()),
  ]

  if (params.senderAddress) conditions.push(eq(t.senderAddress, params.senderAddress.toLowerCase()))
  if (params.recipientAddress) conditions.push(eq(t.recipientAddress, params.recipientAddress.toLowerCase()))
  if (params.fromTimestamp) conditions.push(gte(t.blockTimestamp, params.fromTimestamp))
  if (params.toTimestamp) conditions.push(lte(t.blockTimestamp, params.toTimestamp))

  return getClient(tx)
    .select()
    .from(t)
    .where(and(...conditions))
    .orderBy(t.blockTimestamp)
    .limit(params.limit ?? DEFAULT_TRANSFERS_LIMIT)
    .offset(params.offset ?? 0)
}

export async function getErc721Transfers(
  params: GetTransfersParams,
  tx?: DB
): Promise<Erc721TransferEntity[]> {
  const t = erc721TransfersTable
  const conditions = [
    eq(t.chainId, params.chainId),
    eq(t.tokenAddress, params.tokenAddress.toLowerCase()),
  ]

  if (params.senderAddress) conditions.push(eq(t.senderAddress, params.senderAddress.toLowerCase()))
  if (params.recipientAddress) conditions.push(eq(t.recipientAddress, params.recipientAddress.toLowerCase()))
  if (params.fromTimestamp) conditions.push(gte(t.blockTimestamp, params.fromTimestamp))
  if (params.toTimestamp) conditions.push(lte(t.blockTimestamp, params.toTimestamp))

  return getClient(tx)
    .select()
    .from(t)
    .where(and(...conditions))
    .orderBy(t.blockTimestamp)
    .limit(params.limit ?? DEFAULT_TRANSFERS_LIMIT)
    .offset(params.offset ?? 0)
}

export async function getErc1155Transfers(
  params: GetTransfersParams,
  tx?: DB
): Promise<Erc1155TransferEntity[]> {
  const t = erc1155TransfersTable
  const conditions = [
    eq(t.chainId, params.chainId),
    eq(t.tokenAddress, params.tokenAddress.toLowerCase()),
  ]

  if (params.senderAddress) conditions.push(eq(t.senderAddress, params.senderAddress.toLowerCase()))
  if (params.recipientAddress) conditions.push(eq(t.recipientAddress, params.recipientAddress.toLowerCase()))
  if (params.fromTimestamp) conditions.push(gte(t.blockTimestamp, params.fromTimestamp))
  if (params.toTimestamp) conditions.push(lte(t.blockTimestamp, params.toTimestamp))

  return getClient(tx)
    .select()
    .from(t)
    .where(and(...conditions))
    .orderBy(t.blockTimestamp)
    .limit(params.limit ?? DEFAULT_TRANSFERS_LIMIT)
    .offset(params.offset ?? 0)
}

export const TRANSFER_QUERY_FN: Record<TokenType, (params: GetTransfersParams, tx?: DB) => Promise<TransferEntity[]>> = {
  [TokenType.ERC20]: getErc20Transfers,
  [TokenType.ERC721]: getErc721Transfers,
  [TokenType.ERC1155]: getErc1155Transfers,
}

// ─── Upsert ─────────────────────────────────────────────────

export async function upsertErc20Transfers(
  data: InsertErc20TransferEntity[],
  tx?: DB
): Promise<Erc20TransferEntity[]> {
  if (!data.length) return []

  return getClient(tx)
    .insert(erc20TransfersTable)
    .values(data)
    .onConflictDoUpdate({
      target: [erc20TransfersTable.chainId, erc20TransfersTable.txHash, erc20TransfersTable.logIndex],
      set: { createdAt: erc20TransfersTable.createdAt },
    })
    .returning()
}

export async function upsertErc721Transfers(
  data: InsertErc721TransferEntity[],
  tx?: DB
): Promise<Erc721TransferEntity[]> {
  if (!data.length) return []

  return getClient(tx)
    .insert(erc721TransfersTable)
    .values(data)
    .onConflictDoUpdate({
      target: [erc721TransfersTable.chainId, erc721TransfersTable.txHash, erc721TransfersTable.logIndex],
      set: { createdAt: erc721TransfersTable.createdAt },
    })
    .returning()
}

export async function upsertErc1155Transfers(
  data: InsertErc1155TransferEntity[],
  tx?: DB
): Promise<Erc1155TransferEntity[]> {
  if (!data.length) return []

  return getClient(tx)
    .insert(erc1155TransfersTable)
    .values(data)
    .onConflictDoUpdate({
      target: [erc1155TransfersTable.chainId, erc1155TransfersTable.txHash, erc1155TransfersTable.logIndex],
      set: { createdAt: erc1155TransfersTable.createdAt },
    })
    .returning()
}
