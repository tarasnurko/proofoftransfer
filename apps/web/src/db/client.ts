import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import type { DB } from './index.types'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const conn = postgres(process.env.DATABASE_URL, { max: 1 })

export const db = drizzle(conn, { schema, casing: 'camelCase' })

export function getClient(tx?: DB): DB {
  return tx ?? db;
}
