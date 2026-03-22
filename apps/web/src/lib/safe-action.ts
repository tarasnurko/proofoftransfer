import { createSafeActionClient } from 'next-safe-action'
import { headers } from 'next/headers'
import { checkRateLimit, getIpFromHeaders, type RateLimitConfig } from '@/services/rate-limit'

export const actionClient = createSafeActionClient({
  defaultValidationErrorsShape: 'flattened',
  handleServerError: (e) => {
    return e.message
  },
})

export const createRateLimitedActionClient = (name: string, config: RateLimitConfig) => {
  return actionClient.use(async ({ next }) => {
    let ip = 'unknown'
    try {
      const headersList = await headers()
      ip = getIpFromHeaders(headersList)
    } catch {
      // headers() unavailable outside request scope (e.g. tests)
    }

    const key = `action:${name}:${ip}`
    const result = checkRateLimit(key, config)

    if (result.limited) {
      throw new Error('Too many requests. Please try again later.')
    }

    return next({ ctx: {} })
  })
}
