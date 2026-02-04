import { drizzle } from 'drizzle-orm/postgres-js'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL)
if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn

export const db = drizzle(conn, { schema, casing: 'camelCase' })

export type Schema = typeof schema
export type DB = PostgresJsDatabase<Schema>
