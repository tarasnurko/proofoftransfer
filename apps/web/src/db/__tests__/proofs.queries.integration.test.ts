import { describe, it, expect } from 'vitest'
import { createClaim } from '../queries/claims'
import { createProof, getProofsByClaimId, getProofById, checkNullifierExists } from '../queries/proofs'
import { createVerification } from '../queries/verifications'
import { buildClaimSeed, buildProofSeed, buildVerificationSeed } from '@repo/test-utils'

describe('proofs queries', () => {
  describe('createProof', () => {
    it('creates a proof and returns it', async () => {
      const claim = await createClaim(buildClaimSeed())
      const seed = buildProofSeed(claim.id)
      const proof = await createProof(seed)

      expect(proof.id).toBeDefined()
      expect(proof.claimId).toBe(claim.id)
      expect(proof.nullifier).toBe(seed.nullifier)
    })

    it('enforces unique constraint on claimId + nullifier', async () => {
      const claim = await createClaim(buildClaimSeed())
      const nullifier = '0x' + 'ab'.repeat(32)

      await createProof(buildProofSeed(claim.id, { nullifier }))

      await expect(
        createProof(buildProofSeed(claim.id, { nullifier })),
      ).rejects.toThrow()
    })
  })

  describe('getProofsByClaimId', () => {
    it('returns proofs for a claim with pagination', async () => {
      const claim = await createClaim(buildClaimSeed())
      await createProof(buildProofSeed(claim.id))
      await createProof(buildProofSeed(claim.id))
      await createProof(buildProofSeed(claim.id))

      const result = await getProofsByClaimId(claim.id, { limit: 2, offset: 0 })
      expect(result.proofs).toHaveLength(2)
      expect(result.total).toBe(3)
    })

    it('includes verification stats', async () => {
      const claim = await createClaim(buildClaimSeed())
      const proof = await createProof(buildProofSeed(claim.id))

      await createVerification(buildVerificationSeed(proof.id, { isValid: true }))
      await createVerification(buildVerificationSeed(proof.id, { isValid: true }))
      await createVerification(buildVerificationSeed(proof.id, { isValid: false }))

      const result = await getProofsByClaimId(claim.id)
      expect(result.proofs[0]!.verificationStats.successful).toBe(2)
      expect(result.proofs[0]!.verificationStats.failed).toBe(1)
    })

    it('searches by nullifier', async () => {
      const claim = await createClaim(buildClaimSeed())
      const uniqueNullifier = '0xdeadbeef' + '0'.repeat(56)
      await createProof(buildProofSeed(claim.id, { nullifier: uniqueNullifier }))
      await createProof(buildProofSeed(claim.id))

      const result = await getProofsByClaimId(claim.id, { search: 'deadbeef' })
      expect(result.proofs).toHaveLength(1)
    })

    it('sorts by createdAt', async () => {
      const claim = await createClaim(buildClaimSeed())
      const p1 = await createProof(buildProofSeed(claim.id))
      const p2 = await createProof(buildProofSeed(claim.id))

      const descResult = await getProofsByClaimId(claim.id, { sortOrder: 'desc' })
      expect(descResult.proofs[0]!.id).toBe(p2.id)

      const ascResult = await getProofsByClaimId(claim.id, { sortOrder: 'asc' })
      expect(ascResult.proofs[0]!.id).toBe(p1.id)
    })
  })

  describe('getProofById', () => {
    it('returns proof with claim data', async () => {
      const claim = await createClaim(buildClaimSeed())
      const proof = await createProof(buildProofSeed(claim.id))

      const result = await getProofById(proof.id)
      expect(result).toBeDefined()
      expect(result!.id).toBe(proof.id)
      expect(result!.claim).toBeDefined()
      expect(result!.claim.id).toBe(claim.id)
    })

    it('returns null for non-existent proof', async () => {
      const result = await getProofById('00000000-0000-0000-0000-000000000000')
      expect(result).toBeNull()
    })
  })

  describe('checkNullifierExists', () => {
    it('returns true when nullifier exists for claim', async () => {
      const claim = await createClaim(buildClaimSeed())
      const nullifier = '0x' + 'ff'.repeat(32)
      await createProof(buildProofSeed(claim.id, { nullifier }))

      const exists = await checkNullifierExists({ claimId: claim.id, nullifier })
      expect(exists).toBe(true)
    })

    it('returns false when nullifier does not exist', async () => {
      const claim = await createClaim(buildClaimSeed())

      const exists = await checkNullifierExists({
        claimId: claim.id,
        nullifier: '0x' + '00'.repeat(32),
      })
      expect(exists).toBe(false)
    })
  })
})
