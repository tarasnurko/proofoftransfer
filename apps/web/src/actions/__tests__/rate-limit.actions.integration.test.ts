import { describe, it, expect, vi, beforeEach } from 'vitest'
import { upsertErc20Transfers } from '@/db/queries/transfers'
import { createClaim } from '@/db/queries/claims'
import {
  buildErc20TransferSeed,
  buildClaimSeed,
  buildCreateClaimActionInput,
  buildProofSeed,
  generateEthereumAddress,
} from '@repo/test-utils'
import { ChainId } from '@repo/types'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

beforeEach(() => {
  vi.stubEnv('DISABLE_RATE_LIMIT', 'false')
})

describe('createClaimAction rate limit', () => {
  it('blocks second createClaim call within window (1/min)', async () => {
    const tokenAddress = generateEthereumAddress().toLowerCase()
    const counterpartyAddress = generateEthereumAddress().toLowerCase()

    await upsertErc20Transfers([
      buildErc20TransferSeed({
        tokenAddress,
        recipientAddress: counterpartyAddress,
        chainId: ChainId.ETHEREUM,
        blockTimestamp: 1000,
      }),
    ])

    const { createClaimAction } = await import('@/actions/claims.actions')

    const validInput = buildCreateClaimActionInput({
      tokenAddress,
      counterpartyAddress,
      chainId: ChainId.ETHEREUM,
    })

    // First call should succeed
    const r1 = await createClaimAction(validInput)
    expect(r1?.data?.claimId).toBeDefined()

    // Second call should be rate limited
    const r2 = await createClaimAction({
      ...validInput,
      claimMessage: 'Rate limit test claim message two',
    })
    expect(r2?.serverError).toContain('Too many requests')
  })
})

describe('submitProofAction rate limit', () => {
  function buildPublicInputsWithRoot(merkleRoot: string): string[] {
    const inputs = Array(15).fill('0x00')
    inputs[7] = merkleRoot
    return inputs
  }

  it('blocks second submitProof call within window (1/min)', async () => {
    const merkleRoot1 = '0x' + '0'.repeat(64)
    const merkleRoot2 = '0x' + '1'.repeat(64)
    const claim1 = await createClaim(buildClaimSeed({ merkleRoot: merkleRoot1 }))
    const claim2 = await createClaim(buildClaimSeed({ merkleRoot: merkleRoot2 }))

    const { submitProofAction } = await import('@/actions/proofs.actions')

    const seed1 = buildProofSeed(claim1.id)
    const r1 = await submitProofAction({
      claimId: claim1.id,
      nullifier: seed1.nullifier,
      proofData: seed1.proofData,
      publicInputs: buildPublicInputsWithRoot(merkleRoot1),
    })
    expect(r1?.data?.proofId).toBeDefined()

    // Second call should be rate limited (different claim, different nullifier — still same IP)
    const seed2 = buildProofSeed(claim2.id)
    const r2 = await submitProofAction({
      claimId: claim2.id,
      nullifier: seed2.nullifier,
      proofData: seed2.proofData,
      publicInputs: buildPublicInputsWithRoot(merkleRoot2),
    })
    expect(r2?.serverError).toContain('Too many requests')
  })
})

describe('verifyProofAction rate limit', () => {
  const baseVerifyInput = {
    id: '00000000-0000-0000-0000-000000000000',
    nullifier: buildProofSeed('dummy').nullifier,
    merkleRoot: '12345678901234567890',
  }

  it('allows 5 calls but blocks 6th within window (5/min)', async () => {
    const { verifyProofAction } = await import('@/actions/proofs.actions')

    // First 5 calls: pass rate limit (will fail with "Proof not found" but NOT rate limited)
    for (let i = 0; i < 5; i++) {
      const result = await verifyProofAction(baseVerifyInput)
      expect(result?.serverError).toContain('Proof not found')
    }

    // 6th call should be rate limited
    const r6 = await verifyProofAction(baseVerifyInput)
    expect(r6?.serverError).toContain('Too many requests')
  })

  it('allows requests after rate limit resets', async () => {
    const { _resetRateLimitStore } = await import('@/services/rate-limit')
    const { verifyProofAction } = await import('@/actions/proofs.actions')

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await verifyProofAction(baseVerifyInput)
    }

    const blocked = await verifyProofAction(baseVerifyInput)
    expect(blocked?.serverError).toContain('Too many requests')

    // Reset simulates window expiry
    _resetRateLimitStore()

    const afterReset = await verifyProofAction(baseVerifyInput)
    expect(afterReset?.serverError).toContain('Proof not found')
    expect(afterReset?.serverError).not.toContain('Too many requests')
  })
})
