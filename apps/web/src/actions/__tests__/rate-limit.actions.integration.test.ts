import { describe, it, expect, vi } from 'vitest'
import { upsertErc20Transfers } from '@/db/queries/transfers'
import { createClaim } from '@/db/queries/claims'
import { buildErc20TransferSeed, buildClaimSeed } from '@repo/test-utils'
import { ChainId } from '@repo/types'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('createClaimAction rate limit', () => {
  it('blocks second createClaim call within window (1/min)', async () => {
    const tokenAddress = '0x' + 'a'.repeat(40)
    const counterpartyAddress = '0x' + 'b'.repeat(40)

    // Seed enough transfers for two claim attempts
    await upsertErc20Transfers([
      buildErc20TransferSeed({
        tokenAddress,
        recipientAddress: counterpartyAddress,
        chainId: ChainId.ETHEREUM,
        blockTimestamp: 1000,
        logIndex: 0,
        txHash: '0x' + '1'.repeat(64),
        amount: '1000000000000000000',
      }),
    ])

    const { createClaimAction } = await import('@/actions/claims.actions')

    const validInput = {
      claimMessage: 'Rate limit test claim message one',
      tokenAddress,
      counterpartyAddress,
      isProverSender: true,
      tokenType: 'erc20' as const,
      minTransfersSum: '0',
      maxTransfersSum: '0',
      minTransfersCount: 0,
      maxTransfersCount: 0,
      chainId: ChainId.ETHEREUM,
    }

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
  it('blocks second submitProof call within window (1/min)', async () => {
    const claim1 = await createClaim(buildClaimSeed())
    const claim2 = await createClaim(buildClaimSeed())

    const { submitProofAction } = await import('@/actions/proofs.actions')

    // First call should succeed
    const r1 = await submitProofAction({
      claimId: claim1.id,
      nullifier: '0x' + 'aa'.repeat(32),
      proofData: '0x' + 'cd'.repeat(64),
      publicInputs: ['0x01', '0x02'],
    })
    expect(r1?.data?.proofId).toBeDefined()

    // Second call should be rate limited (different claim, different nullifier — still same IP)
    const r2 = await submitProofAction({
      claimId: claim2.id,
      nullifier: '0x' + 'bb'.repeat(32),
      proofData: '0x' + 'ef'.repeat(64),
      publicInputs: ['0x03'],
    })
    expect(r2?.serverError).toContain('Too many requests')
  })
})

describe('verifyProofAction rate limit', () => {
  it('allows 5 calls but blocks 6th within window (5/min)', async () => {
    const { verifyProofAction } = await import('@/actions/proofs.actions')

    const input = {
      id: '00000000-0000-0000-0000-000000000000',
      nullifier: '0x' + 'cc'.repeat(32),
      transfers: [{
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        contractAddress: '0x' + '3'.repeat(40),
        value: '1000',
        timeStamp: '1700000000',
      }],
    }

    // First 5 calls: pass rate limit (will fail with "Proof not found" but NOT rate limited)
    for (let i = 0; i < 5; i++) {
      const result = await verifyProofAction(input)
      expect(result?.serverError).toContain('Proof not found')
    }

    // 6th call should be rate limited
    const r6 = await verifyProofAction(input)
    expect(r6?.serverError).toContain('Too many requests')
  })

  it('allows requests after rate limit resets', async () => {
    // Use a very short window by directly importing the limiter
    // Instead, we test via _resetRateLimitStore
    const { _resetRateLimitStore } = await import('@/services/rate-limit')
    const { verifyProofAction } = await import('@/actions/proofs.actions')

    const input = {
      id: '00000000-0000-0000-0000-000000000000',
      nullifier: '0x' + 'dd'.repeat(32),
      transfers: [{
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        contractAddress: '0x' + '3'.repeat(40),
        value: '1000',
        timeStamp: '1700000000',
      }],
    }

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await verifyProofAction(input)
    }

    const blocked = await verifyProofAction(input)
    expect(blocked?.serverError).toContain('Too many requests')

    // Reset simulates window expiry
    _resetRateLimitStore()

    const afterReset = await verifyProofAction(input)
    expect(afterReset?.serverError).toContain('Proof not found')
    expect(afterReset?.serverError).not.toContain('Too many requests')
  })
})
