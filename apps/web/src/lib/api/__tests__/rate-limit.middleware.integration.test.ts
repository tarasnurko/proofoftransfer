import { TokenType } from '@repo/types'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { _resetRateLimitStore } from '@/services/rate-limit'
import { createRateLimitMiddleware } from '@/lib/api/middleware/rate-limit.middleware'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

beforeEach(() => {
  _resetRateLimitStore()
})

function createTestApp(maxRequests: number) {
  return new Hono()
    .get(
      '/test',
      createRateLimitMiddleware('test', { maxRequests, windowMs: 60_000 }),
      (c) => c.json({ ok: true }),
    )
}

function requestWithIp(app: Hono, ip: string) {
  return app.request('/test', {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('createRateLimitMiddleware', () => {
  it('allows requests under the limit', async () => {
    const app = createTestApp(3)

    const r1 = await requestWithIp(app, '1.1.1.1')
    const r2 = await requestWithIp(app, '1.1.1.1')
    const r3 = await requestWithIp(app, '1.1.1.1')

    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(r3.status).toBe(200)
  })

  it('returns 429 after exceeding the limit', async () => {
    const app = createTestApp(2)

    await requestWithIp(app, '2.2.2.2')
    await requestWithIp(app, '2.2.2.2')
    const r3 = await requestWithIp(app, '2.2.2.2')

    expect(r3.status).toBe(429)
    const body = await r3.json()
    expect(body.error).toBe('Too many requests')
    expect(body.retryAfter).toBeGreaterThan(0)
  })

  it('returns 429 on all subsequent requests after limit exceeded', async () => {
    const app = createTestApp(1)

    await requestWithIp(app, '3.3.3.3')
    const r2 = await requestWithIp(app, '3.3.3.3')
    const r3 = await requestWithIp(app, '3.3.3.3')

    expect(r2.status).toBe(429)
    expect(r3.status).toBe(429)
  })

  it('tracks different IPs independently', async () => {
    const app = createTestApp(1)

    await requestWithIp(app, '4.4.4.4')
    const blocked = await requestWithIp(app, '4.4.4.4')
    const allowed = await requestWithIp(app, '5.5.5.5')

    expect(blocked.status).toBe(429)
    expect(allowed.status).toBe(200)
  })

  it('sets X-RateLimit-Limit header', async () => {
    const app = createTestApp(5)
    const res = await requestWithIp(app, '6.6.6.6')

    expect(res.headers.get('X-RateLimit-Limit')).toBe('5')
  })

  it('sets X-RateLimit-Remaining header that decrements', async () => {
    const app = createTestApp(3)

    const r1 = await requestWithIp(app, '7.7.7.7')
    const r2 = await requestWithIp(app, '7.7.7.7')
    const r3 = await requestWithIp(app, '7.7.7.7')

    expect(r1.headers.get('X-RateLimit-Remaining')).toBe('2')
    expect(r2.headers.get('X-RateLimit-Remaining')).toBe('1')
    expect(r3.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('sets X-RateLimit-Reset header as unix timestamp', async () => {
    const app = createTestApp(3)
    const before = Math.ceil(Date.now() / 1000)

    const res = await requestWithIp(app, '8.8.8.8')
    const reset = Number(res.headers.get('X-RateLimit-Reset'))

    expect(reset).toBeGreaterThanOrEqual(before)
    expect(reset).toBeLessThanOrEqual(before + 61)
  })

  it('sets remaining to 0 in 429 response headers', async () => {
    const app = createTestApp(1)

    await requestWithIp(app, '9.9.9.9')
    const blocked = await requestWithIp(app, '9.9.9.9')

    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('works with limit of 1 (strictest)', async () => {
    const app = createTestApp(1)

    const r1 = await requestWithIp(app, '10.10.10.10')
    const r2 = await requestWithIp(app, '10.10.10.10')

    expect(r1.status).toBe(200)
    expect(r1.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(r2.status).toBe(429)
  })
})

describe('rate limiting on real Hono app routes', () => {
  async function getApp() {
    const { honoApp } = await import('@/lib/api/app')
    return honoApp
  }

  it('returns 429 on GET /:id/proofs after exceeding limit', async () => {
    const app = await getApp()
    const fakeId = '00000000-0000-0000-0000-000000000000'
    const url = `/api/claims/${fakeId}/proofs`

    // RATE_LIMITS.getProofs = 30/min — send 31 requests
    const responses = []
    for (let i = 0; i < 31; i++) {
      responses.push(await app.request(url, { headers: { 'x-forwarded-for': '11.11.11.11' } }))
    }

    const lastResponse = responses[30]!
    expect(lastResponse.status).toBe(429)

    const body = await lastResponse.json()
    expect(body.error).toBe('Too many requests')
  })

  it('returns 429 on POST /claims/load-transfers after exceeding limit', async () => {
    const app = await getApp()

    // RATE_LIMITS.loadTransfers = 3/min — send 4 requests
    const responses = []
    for (let i = 0; i < 4; i++) {
      responses.push(
        await app.request('/api/claims/load-transfers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': '13.13.13.13',
          },
          body: JSON.stringify({
            chainId: 1,
            tokenAddress: '0x' + 'a'.repeat(40),
            counterpartyAddress: '0x' + 'b'.repeat(40),
            isProverSender: true,
            tokenType: TokenType.ERC20,
          }),
        }),
      )
    }

    const lastResponse = responses[3]!
    expect(lastResponse.status).toBe(429)
  })
})
