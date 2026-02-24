import { describe, it, expect, vi } from 'vitest'
import { upsertErc20Transfers } from '@/db/queries/transfers'
import { buildErc20TransferSeed } from '@repo/test-utils'
import { ChainId } from '@repo/types'

// Mock next/cache since it's not available outside Next.js runtime
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('createClaimAction', () => {
  it('creates a claim when transfers exist', async () => {
    const tokenAddress = '0x' + 'a'.repeat(40)
    const counterpartyAddress = '0x' + 'b'.repeat(40)

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

    // Dynamic import after mock is set up
    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction({
      claimMessage: 'Test claim message for integration',
      tokenAddress,
      counterpartyAddress,
      isProverSender: true,
      tokenType: 'erc20',
      minTransfersSum: '0',
      maxTransfersSum: '0',
      minTransfersCount: 0,
      maxTransfersCount: 0,
      chainId: ChainId.ETHEREUM,
    })

    expect(result?.data?.claimId).toBeDefined()
  })

  it('fails when no transfers exist', async () => {
    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction({
      claimMessage: 'Test claim with no transfers',
      tokenAddress: '0x' + 'c'.repeat(40),
      counterpartyAddress: '0x' + 'd'.repeat(40),
      isProverSender: true,
      tokenType: 'erc20',
      minTransfersSum: '0',
      maxTransfersSum: '0',
      minTransfersCount: 0,
      maxTransfersCount: 0,
      chainId: ChainId.ETHEREUM,
    })

    expect(result?.serverError).toContain('No transfers found')
  })

  it('returns validation errors for invalid input', async () => {
    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction({
      claimMessage: 'short', // too short
      tokenAddress: 'invalid',
      counterpartyAddress: '0x' + 'a'.repeat(40),
      isProverSender: true,
      tokenType: 'erc20',
      chainId: ChainId.ETHEREUM,
    })

    expect(result?.validationErrors).toBeDefined()
  })
})
