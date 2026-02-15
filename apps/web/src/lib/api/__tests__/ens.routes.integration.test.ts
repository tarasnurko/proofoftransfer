import { describe, it, expect, vi, beforeEach } from 'vitest'
import { _resetRateLimitStore } from '@/services/rate-limit'
import { upsertEnsCache } from '@/db/queries/ens'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getEnsAddress: vi.fn().mockResolvedValue(null),
      getEnsName: vi.fn().mockResolvedValue(null),
      readContract: vi.fn().mockResolvedValue(BigInt(0)),
    })),
  }
})

vi.mock('viem/ens', () => ({
  normalize: (name: string) => name.toLowerCase(),
}))

beforeEach(() => {
  _resetRateLimitStore()
})

describe('ENS routes (Hono)', () => {
  async function getApp() {
    const { honoApp } = await import('@/lib/api/app')
    return honoApp
  }

  describe('GET /api/ens/resolve', () => {
    it('resolves a cached address to ENS name', async () => {
      const address = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
      await upsertEnsCache({ address, name: 'vitalik.eth', expiresAt: new Date(Date.now() + 86400000) })

      const app = await getApp()
      const res = await app.request(`/api/ens/resolve?input=${address}`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.address).toBe(address)
      expect(body.data.ensName).toBe('vitalik.eth')
    })

    it('resolves a cached ENS name to address', async () => {
      const address = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
      await upsertEnsCache({ address, name: 'vitalik.eth', expiresAt: new Date(Date.now() + 86400000) })

      const app = await getApp()
      const res = await app.request('/api/ens/resolve?input=vitalik.eth')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.address).toBe(address)
      expect(body.data.ensName).toBe('vitalik.eth')
    })

    it('returns 404 for unresolvable ENS name', async () => {
      const app = await getApp()
      const res = await app.request('/api/ens/resolve?input=nonexistent.eth')

      expect(res.status).toBe(404)
      const body = await res.json()
      expect(body.error).toBeDefined()
    })

    it('returns 400 when input is missing', async () => {
      const app = await getApp()
      const res = await app.request('/api/ens/resolve')

      expect(res.status).toBe(400)
    })

    it('returns 400 when input is empty', async () => {
      const app = await getApp()
      const res = await app.request('/api/ens/resolve?input=')

      expect(res.status).toBe(400)
    })

    it('rate limits after too many requests', async () => {
      const app = await getApp()

      const responses = []
      for (let i = 0; i < 11; i++) {
        responses.push(
          await app.request('/api/ens/resolve?input=test.eth', {
            headers: { 'x-forwarded-for': '20.20.20.20' },
          })
        )
      }

      const lastResponse = responses[10]!
      expect(lastResponse.status).toBe(429)
    })
  })
})
