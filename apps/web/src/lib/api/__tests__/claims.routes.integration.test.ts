import { describe, it, expect, vi } from 'vitest'
import { createClaim } from '@/db/queries/claims'
import { createProof } from '@/db/queries/proofs'
import { upsertTransfers } from '@/db/queries/transfers'
import { buildClaimSeed, buildProofSeed, buildTransferSeed } from '@repo/test-utils'

// The hono app imports modules that may reference next/cache transitively
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('claims routes (Hono)', () => {
  async function getApp() {
    const { honoApp } = await import('@/lib/api/app')
    return honoApp
  }

  describe('GET /:id/proofs', () => {
    it('returns proofs for a claim', async () => {
      const claim = await createClaim(buildClaimSeed())
      await createProof(buildProofSeed(claim.id))
      await createProof(buildProofSeed(claim.id))

      const app = await getApp()
      const res = await app.request(`/api/claims/${claim.id}/proofs`)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.proofs).toHaveLength(2)
      expect(data.total).toBe(2)
    })

    it('supports pagination', async () => {
      const claim = await createClaim(buildClaimSeed())
      await createProof(buildProofSeed(claim.id))
      await createProof(buildProofSeed(claim.id))
      await createProof(buildProofSeed(claim.id))

      const app = await getApp()
      const res = await app.request(`/api/claims/${claim.id}/proofs?limit=1&page=1`)
      const data = await res.json()

      expect(data.proofs).toHaveLength(1)
      expect(data.total).toBe(3)
    })
  })

  describe('GET /:id/transfers', () => {
    it('returns transfers for a claim', async () => {
      const tokenAddress = '0x' + 'a'.repeat(40)
      const recipientAddress = '0x' + 'b'.repeat(40)

      await upsertTransfers([
        buildTransferSeed({ tokenAddress, recipientAddress, chainId: 1, logIndex: 0, txHash: '0x' + '1'.repeat(64) }),
      ])

      const claim = await createClaim(buildClaimSeed({
        tokenAddress,
        recipientAddress,
        chainId: 1,
      }))

      const app = await getApp()
      const res = await app.request(`/api/claims/${claim.id}/transfers`)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(1)
    })
  })

  describe('GET /:id/nullifier-exists', () => {
    it('returns exists=true when nullifier found', async () => {
      const claim = await createClaim(buildClaimSeed())
      const nullifier = '0x' + 'ab'.repeat(32)
      await createProof(buildProofSeed(claim.id, { nullifier }))

      const app = await getApp()
      const res = await app.request(`/api/claims/${claim.id}/nullifier-exists?nullifier=${nullifier}`)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.exists).toBe(true)
    })

    it('returns exists=false when nullifier not found', async () => {
      const claim = await createClaim(buildClaimSeed())

      const app = await getApp()
      const res = await app.request(`/api/claims/${claim.id}/nullifier-exists?nullifier=0x1234`)
      const data = await res.json()

      expect(data.exists).toBe(false)
    })
  })
})
