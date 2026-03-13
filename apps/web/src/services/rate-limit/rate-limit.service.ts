import { MS_PER_MINUTE } from '@/constants'

// --- Types ---

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  limited: boolean
  remaining: number
  resetAt: number
}

// --- Store ---

const CLEANUP_INTERVAL_MS = MS_PER_MINUTE

const store = new Map<string, RateLimitEntry>()

let cleanupInterval: ReturnType<typeof setInterval> | null = null

const ensureCleanup = (): void => {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key)
    }
  }, CLEANUP_INTERVAL_MS)
  if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
    cleanupInterval.unref()
  }
}

// --- Core ---

const skipRateLimit = process.env.DISABLE_RATE_LIMIT === 'true'

export const checkRateLimit = (key: string, config: RateLimitConfig): RateLimitResult => {
  if (skipRateLimit) {
    return { limited: false, remaining: config.maxRequests, resetAt: Date.now() + config.windowMs }
  }

  ensureCleanup()
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { limited: false, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  entry.count++
  if (entry.count > config.maxRequests) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt }
  }

  return { limited: false, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

// --- IP extraction ---

export const getIpFromHeaders = (headers: Headers): string => {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}

// --- Rate limit configs ---

export const RATE_LIMITS = {
  // Server actions
  CREATE_CLAIM: { maxRequests: 1, windowMs: MS_PER_MINUTE },
  SUBMIT_PROOF: { maxRequests: 1, windowMs: MS_PER_MINUTE },
  VERIFY_PROOF: { maxRequests: 5, windowMs: MS_PER_MINUTE },

  // Hono: cheap DB reads
  GET_PROOFS: { maxRequests: 30, windowMs: MS_PER_MINUTE },
  GET_TRANSFERS: { maxRequests: 30, windowMs: MS_PER_MINUTE },
  GET_NULLIFIER_EXISTS: { maxRequests: 30, windowMs: MS_PER_MINUTE },
  GET_VERIFIER_STATUS: { maxRequests: 30, windowMs: MS_PER_MINUTE },

  // Hono: expensive external/computation
  GET_ETHERSCAN_TRANSFERS: { maxRequests: 5, windowMs: MS_PER_MINUTE },
  LOAD_TRANSFERS: { maxRequests: 3, windowMs: MS_PER_MINUTE },
  PROVER_SIGNING_DATA: { maxRequests: 5, windowMs: MS_PER_MINUTE },
  VERIFIER_SIGNING_DATA: { maxRequests: 10, windowMs: MS_PER_MINUTE },
  PROCESS_SIGNATURE: { maxRequests: 5, windowMs: MS_PER_MINUTE },
  GET_TOKEN: { maxRequests: 10, windowMs: MS_PER_MINUTE },
  RESOLVE_ENS: { maxRequests: 10, windowMs: MS_PER_MINUTE },
} as const satisfies Record<string, RateLimitConfig>

// For testing only — reset all rate limit state
export const _resetRateLimitStore = (): void => {
  store.clear()
}

export type { RateLimitConfig }
