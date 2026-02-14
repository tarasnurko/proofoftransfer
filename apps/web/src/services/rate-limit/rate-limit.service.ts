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

const CLEANUP_INTERVAL_MS = 60_000

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

export const checkRateLimit = (key: string, config: RateLimitConfig): RateLimitResult => {
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
  CREATE_CLAIM: { maxRequests: 1, windowMs: 60_000 },
  SUBMIT_PROOF: { maxRequests: 1, windowMs: 60_000 },
  VERIFY_PROOF: { maxRequests: 5, windowMs: 60_000 },

  // Hono: cheap DB reads
  GET_PROOFS: { maxRequests: 30, windowMs: 60_000 },
  GET_TRANSFERS: { maxRequests: 30, windowMs: 60_000 },
  GET_NULLIFIER_EXISTS: { maxRequests: 30, windowMs: 60_000 },

  // Hono: expensive external/computation
  GET_ETHERSCAN_TRANSFERS: { maxRequests: 5, windowMs: 60_000 },
  LOAD_TRANSFERS: { maxRequests: 3, windowMs: 60_000 },
  PROVER_SIGNING_DATA: { maxRequests: 5, windowMs: 60_000 },
  VERIFIER_SIGNING_DATA: { maxRequests: 10, windowMs: 60_000 },
  PROCESS_SIGNATURE: { maxRequests: 5, windowMs: 60_000 },
  GET_TOKEN: { maxRequests: 10, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitConfig>

// For testing only — reset all rate limit state
export const _resetRateLimitStore = (): void => {
  store.clear()
}

export type { RateLimitConfig }
