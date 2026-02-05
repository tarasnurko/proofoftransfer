import { drizzle } from 'drizzle-orm/postgres-js'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

const conn = postgres(process.env.DATABASE_URL, { max: 1 })

export const db = drizzle(conn, { schema, casing: 'camelCase' })

export type Schema = typeof schema
export type DB = PostgresJsDatabase<Schema>
