import { sql } from 'drizzle-orm'

/**
 * Truncate all tables in FK-safe order.
 * Pass the drizzle db instance from the web app.
 */
export async function truncateAll(db: { execute: (query: ReturnType<typeof sql>) => Promise<unknown> }) {
  await db.execute(sql`TRUNCATE TABLE proof_verifications, proofs, transfers, claims, tokens CASCADE`)
}
