import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

// Singleton connection
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL)
if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn

export const db = drizzle(conn, { schema })

// Helper function to check database connection
export async function testConnection() {
  try {
    await conn`SELECT 1`
    return { success: true }
  } catch (error) {
    console.error('Database connection failed:', error)
    return { success: false, error }
  }
}
