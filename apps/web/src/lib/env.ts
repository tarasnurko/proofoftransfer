import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  BASESCAN_API_KEY: z.string().min(1, 'BASESCAN_API_KEY is required'),
})

// Validate environment variables
export function validateEnv() {
  try {
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      BASESCAN_API_KEY: process.env.BASESCAN_API_KEY,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => e.path.join('.')).join(', ')
      throw new Error(`Missing or invalid environment variables: ${missingVars}`)
    }
    throw error
  }
}

// Get environment variable safely
export function getEnv(key: 'DATABASE_URL' | 'BASESCAN_API_KEY'): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value
}
