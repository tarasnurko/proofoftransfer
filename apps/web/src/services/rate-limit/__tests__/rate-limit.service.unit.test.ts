import { describe, it, expect, beforeEach, vi } from 'vitest'
import { checkRateLimit, getIpFromHeaders, _resetRateLimitStore } from '@/services/rate-limit'

beforeEach(() => {
  vi.stubEnv('DISABLE_RATE_LIMIT', 'false')
  _resetRateLimitStore()
})

describe('checkRateLimit', () => {
  const config = { maxRequests: 3, windowMs: 60_000 }

  it('allows first request', () => {
    const result = checkRateLimit('test-key', config)

    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(2)
  })

  it('decrements remaining on each request', () => {
    const r1 = checkRateLimit('key-a', config)
    const r2 = checkRateLimit('key-a', config)
    const r3 = checkRateLimit('key-a', config)

    expect(r1.remaining).toBe(2)
    expect(r2.remaining).toBe(1)
    expect(r3.remaining).toBe(0)
  })

  it('blocks after maxRequests exceeded', () => {
    checkRateLimit('key-b', config)
    checkRateLimit('key-b', config)
    checkRateLimit('key-b', config)

    const r4 = checkRateLimit('key-b', config)

    expect(r4.limited).toBe(true)
    expect(r4.remaining).toBe(0)
  })

  it('stays blocked on subsequent requests after limit hit', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('key-c', config)

    const r4 = checkRateLimit('key-c', config)
    const r5 = checkRateLimit('key-c', config)

    expect(r4.limited).toBe(true)
    expect(r5.limited).toBe(true)
  })

  it('tracks different keys independently', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('key-x', config)

    const blockedResult = checkRateLimit('key-x', config)
    const freshResult = checkRateLimit('key-y', config)

    expect(blockedResult.limited).toBe(true)
    expect(freshResult.limited).toBe(false)
    expect(freshResult.remaining).toBe(2)
  })

  it('resets after window expires', () => {
    const shortConfig = { maxRequests: 1, windowMs: 50 }
    checkRateLimit('key-expire', shortConfig)

    const blocked = checkRateLimit('key-expire', shortConfig)
    expect(blocked.limited).toBe(true)

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const afterExpiry = checkRateLimit('key-expire', shortConfig)
        expect(afterExpiry.limited).toBe(false)
        expect(afterExpiry.remaining).toBe(0)
        resolve()
      }, 60)
    })
  })

  it('returns resetAt timestamp in the future', () => {
    const before = Date.now()
    const result = checkRateLimit('key-reset', config)

    expect(result.resetAt).toBeGreaterThan(before)
    expect(result.resetAt).toBeLessThanOrEqual(before + config.windowMs + 10)
  })

  it('works with maxRequests of 1', () => {
    const strictConfig = { maxRequests: 1, windowMs: 60_000 }

    const r1 = checkRateLimit('key-strict', strictConfig)
    const r2 = checkRateLimit('key-strict', strictConfig)

    expect(r1.limited).toBe(false)
    expect(r1.remaining).toBe(0)
    expect(r2.limited).toBe(true)
  })

  it('clears store via _resetRateLimitStore', () => {
    checkRateLimit('key-clear', config)
    checkRateLimit('key-clear', config)
    checkRateLimit('key-clear', config)

    const blocked = checkRateLimit('key-clear', config)
    expect(blocked.limited).toBe(true)

    _resetRateLimitStore()

    const afterReset = checkRateLimit('key-clear', config)
    expect(afterReset.limited).toBe(false)
    expect(afterReset.remaining).toBe(2)
  })
})

describe('getIpFromHeaders', () => {
  it('extracts IP from x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.1' })
    expect(getIpFromHeaders(headers)).toBe('10.0.0.1')
  })

  it('ignores x-forwarded-for (spoofable)', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4' })
    expect(getIpFromHeaders(headers)).toBe('unknown')
  })

  it('uses x-real-ip even when x-forwarded-for is present', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.2.3.4',
      'x-real-ip': '10.0.0.1',
    })
    expect(getIpFromHeaders(headers)).toBe('10.0.0.1')
  })

  it('returns unknown when no IP headers present', () => {
    const headers = new Headers()
    expect(getIpFromHeaders(headers)).toBe('unknown')
  })
})
