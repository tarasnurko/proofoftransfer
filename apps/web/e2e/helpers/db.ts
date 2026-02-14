import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../../src/db/schema'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://pot:pot_dev_password@localhost:5432/proofoftransfer'

const conn = postgres(DATABASE_URL, { max: 1 })
export const testDb = drizzle(conn, { schema, casing: 'camelCase' })

export async function seedClaim(data: typeof schema.claimsTable.$inferInsert) {
  const [claim] = await testDb.insert(schema.claimsTable).values(data).returning()
  return claim!
}

export async function seedProof(data: typeof schema.proofsTable.$inferInsert) {
  const [proof] = await testDb.insert(schema.proofsTable).values(data).returning()
  return proof!
}

export async function seedToken(data: typeof schema.tokensTable.$inferInsert) {
  const [token] = await testDb.insert(schema.tokensTable).values(data).returning()
  return token!
}

export async function seedTransfer(data: typeof schema.transfersTable.$inferInsert) {
  const [transfer] = await testDb.insert(schema.transfersTable).values(data).returning()
  return transfer!
}

export async function truncateAll() {
  await testDb.execute(sql`TRUNCATE TABLE proof_verifications, proofs, transfers, claims, tokens CASCADE`)
}

export async function closeDb() {
  await conn.end()
}
