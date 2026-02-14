import type { MiddlewareHandler } from 'hono'
import { createMiddleware } from 'hono/factory'
import { checkRateLimit, getIpFromHeaders, type RateLimitConfig } from '@/services/rate-limit'

export const createRateLimitMiddleware = (name: string, config: RateLimitConfig): MiddlewareHandler => {
  return createMiddleware(async (c, next) => {
    const ip = getIpFromHeaders(c.req.raw.headers)
    const key = `hono:${name}:${ip}`
    const result = checkRateLimit(key, config)

    c.header('X-RateLimit-Limit', config.maxRequests.toString())
    c.header('X-RateLimit-Remaining', result.remaining.toString())
    c.header('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString())

    if (result.limited) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000)
      c.header('Retry-After', retryAfter.toString())
      return c.json(
        { error: 'Too many requests', retryAfter },
        429,
      )
    }

    await next()
  })
}
