import { describe, it, expect, beforeEach } from 'vitest'
import { createClaim, getClaims, getClaimById, getClaimByMessageHash } from '../queries/claims'
import { createProof } from '../queries/proofs'
import { createToken } from '../queries/tokens'
import { buildClaimSeed, buildProofSeed, buildTokenSeed } from '@repo/test-utils'

describe('claims queries', () => {
  describe('createClaim', () => {
    it('creates a claim and returns it', async () => {
      const seed = buildClaimSeed()
      const claim = await createClaim(seed)

      expect(claim.id).toBeDefined()
      expect(claim.message).toBe(seed.message)
      expect(claim.tokenAddress).toBe(seed.tokenAddress)
      expect(claim.chainId).toBe(seed.chainId)
    })
  })

  describe('getClaims', () => {
    it('returns paginated claims', async () => {
      await createClaim(buildClaimSeed({ message: 'Claim A' }))
      await createClaim(buildClaimSeed({ message: 'Claim B' }))
      await createClaim(buildClaimSeed({ message: 'Claim C' }))

      const result = await getClaims({ limit: 2, offset: 0 })
      expect(result.claims).toHaveLength(2)
      expect(result.total).toBe(3)
    })

    it('filters by chainId', async () => {
      await createClaim(buildClaimSeed({ chainId: 1 }))
      await createClaim(buildClaimSeed({ chainId: 56 }))

      const result = await getClaims({ chainId: 1 })
      expect(result.claims).toHaveLength(1)
      expect(result.claims[0]!.chainId).toBe(1)
    })

    it('searches by message', async () => {
      await createClaim(buildClaimSeed({ message: 'Find this unique claim' }))
      await createClaim(buildClaimSeed({ message: 'Another unrelated claim' }))

      const result = await getClaims({ search: 'unique' })
      expect(result.claims).toHaveLength(1)
      expect(result.claims[0]!.message).toContain('unique')
    })

    it('sorts by createdAt desc by default', async () => {
      const c1 = await createClaim(buildClaimSeed({ message: 'First' }))
      const c2 = await createClaim(buildClaimSeed({ message: 'Second' }))

      const result = await getClaims()
      expect(result.claims[0]!.id).toBe(c2.id)
    })

    it('sorts by createdAt asc', async () => {
      const c1 = await createClaim(buildClaimSeed({ message: 'First' }))
      const c2 = await createClaim(buildClaimSeed({ message: 'Second' }))

      const result = await getClaims({ sortBy: 'createdAt', sortOrder: 'asc' })
      expect(result.claims[0]!.id).toBe(c1.id)
    })

    it('includes proofCount', async () => {
      const claim = await createClaim(buildClaimSeed())
      await createProof(buildProofSeed(claim.id))
      await createProof(buildProofSeed(claim.id))

      const result = await getClaims()
      expect(result.claims[0]!.proofCount).toBe(2)
    })

    it('includes token data when available', async () => {
      const tokenSeed = buildTokenSeed()
      await createToken(tokenSeed)
      const claim = await createClaim(buildClaimSeed({
        tokenAddress: tokenSeed.address,
        chainId: tokenSeed.chainId,
      }))

      const result = await getClaims()
      expect(result.claims[0]!.token).toBeDefined()
      expect(result.claims[0]!.token!.symbol).toBe('TST')
    })
  })

  describe('getClaimById', () => {
    it('returns claim with proofCount and token', async () => {
      const claim = await createClaim(buildClaimSeed())
      const result = await getClaimById(claim.id)

      expect(result).toBeDefined()
      expect(result!.id).toBe(claim.id)
      expect(result!.proofCount).toBe(0)
    })

    it('returns null for non-existent id', async () => {
      const result = await getClaimById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('getClaimByMessageHash', () => {
    it('returns claim by message hash', async () => {
      const seed = buildClaimSeed({ messageHash: '0xuniquehash123' })
      await createClaim(seed)

      const result = await getClaimByMessageHash('0xuniquehash123')
      expect(result).toBeDefined()
      expect(result!.messageHash).toBe('0xuniquehash123')
    })

    it('returns null when not found', async () => {
      const result = await getClaimByMessageHash('0xnonexistent')
      expect(result).toBeNull()
    })
  })
})
