import { describe, it, expect } from 'vitest'
import { createClaim } from '../queries/claims'
import { createProof } from '../queries/proofs'
import {
  createVerification,
  getVerificationStats,
  getSuccessfulVerificationByNullifier,
  deleteFailedVerificationsByNullifier,
} from '../queries/verifications'
import { buildClaimSeed, buildProofSeed, buildVerificationSeed } from '@repo/test-utils'

async function createTestProof() {
  const claim = await createClaim(buildClaimSeed())
  return createProof(buildProofSeed(claim.id))
}

describe('verifications queries', () => {
  describe('createVerification', () => {
    it('creates a verification record', async () => {
      const proof = await createTestProof()
      const v = await createVerification(buildVerificationSeed(proof.id))

      expect(v.id).toBeDefined()
      expect(v.proofId).toBe(proof.id)
      expect(v.isValid).toBe(true)
    })
  })

  describe('getVerificationStats', () => {
    it('returns correct counts', async () => {
      const proof = await createTestProof()

      await createVerification(buildVerificationSeed(proof.id, { isValid: true }))
      await createVerification(buildVerificationSeed(proof.id, { isValid: true }))
      await createVerification(buildVerificationSeed(proof.id, { isValid: false }))

      const stats = await getVerificationStats(proof.id)
      expect(stats.total).toBe(3)
      expect(stats.successful).toBe(2)
      expect(stats.failed).toBe(1)
    })

    it('returns zeros for proof with no verifications', async () => {
      const proof = await createTestProof()
      const stats = await getVerificationStats(proof.id)

      expect(stats.total).toBe(0)
      expect(stats.successful).toBe(0)
      expect(stats.failed).toBe(0)
    })
  })

  describe('getSuccessfulVerificationByNullifier', () => {
    it('returns successful verification', async () => {
      const proof = await createTestProof()
      const nullifier = '0x' + 'aa'.repeat(32)

      await createVerification(buildVerificationSeed(proof.id, {
        verifierNullifier: nullifier,
        isValid: true,
      }))

      const result = await getSuccessfulVerificationByNullifier({
        proofId: proof.id,
        nullifier,
      })
      expect(result).toBeDefined()
      expect(result!.isValid).toBe(true)
    })

    it('returns null when only failed verifications exist', async () => {
      const proof = await createTestProof()
      const nullifier = '0x' + 'bb'.repeat(32)

      await createVerification(buildVerificationSeed(proof.id, {
        verifierNullifier: nullifier,
        isValid: false,
      }))

      const result = await getSuccessfulVerificationByNullifier({
        proofId: proof.id,
        nullifier,
      })
      expect(result).toBeNull()
    })
  })

  describe('deleteFailedVerificationsByNullifier', () => {
    it('deletes only failed verifications for the nullifier', async () => {
      const proof = await createTestProof()
      const nullifier = '0x' + 'cc'.repeat(32)

      await createVerification(buildVerificationSeed(proof.id, {
        verifierNullifier: nullifier,
        isValid: false,
      }))
      await createVerification(buildVerificationSeed(proof.id, {
        verifierNullifier: nullifier,
        isValid: true,
      }))

      await deleteFailedVerificationsByNullifier({ proofId: proof.id, nullifier })

      const stats = await getVerificationStats(proof.id)
      expect(stats.total).toBe(1)
      expect(stats.successful).toBe(1)
      expect(stats.failed).toBe(0)
    })
  })
})
