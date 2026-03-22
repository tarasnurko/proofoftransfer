import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../../src/db/schema'
import type {
  InsertClaimEntity,
  InsertProofEntity,
  InsertTokenEntity,
  InsertErc20TransferEntity,
  InsertErc721TransferEntity,
  InsertErc1155TransferEntity,
  InsertEnsCacheEntity,
} from '../../src/db/index.types'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://pot:pot_dev_password@localhost:5432/proofoftransfer'

const conn = postgres(DATABASE_URL, { max: 1 })
export const testDb = drizzle(conn, { schema, casing: 'camelCase' })

export async function seedClaim(data: InsertClaimEntity) {
  const [claim] = await testDb.insert(schema.claimsTable).values(data).returning()
  return claim!
}

export async function seedProof(data: InsertProofEntity) {
  const [proof] = await testDb.insert(schema.proofsTable).values(data).returning()
  return proof!
}

export async function seedToken(data: InsertTokenEntity) {
  const [token] = await testDb.insert(schema.tokensTable).values(data).returning()
  return token!
}

export async function seedErc20Transfer(data: InsertErc20TransferEntity) {
  const [transfer] = await testDb.insert(schema.erc20TransfersTable).values(data).returning()
  return transfer!
}

export async function seedErc721Transfer(data: InsertErc721TransferEntity) {
  const [transfer] = await testDb.insert(schema.erc721TransfersTable).values(data).returning()
  return transfer!
}

export async function seedErc1155Transfer(data: InsertErc1155TransferEntity) {
  const [transfer] = await testDb.insert(schema.erc1155TransfersTable).values(data).returning()
  return transfer!
}

/** @deprecated Use seedErc20Transfer instead */
export async function seedTransfer(data: InsertErc20TransferEntity) {
  return seedErc20Transfer(data)
}

export async function seedEnsCache(data: InsertEnsCacheEntity) {
  const [record] = await testDb.insert(schema.ensCacheTable).values(data).returning()
  return record!
}

export async function truncateAll() {
  await testDb.execute(sql`TRUNCATE TABLE proof_verifications, proofs, erc20_transfers, erc721_transfers, erc1155_transfers, claims, tokens, ens_cache CASCADE`)
}

export async function closeDb() {
  await conn.end()
}
