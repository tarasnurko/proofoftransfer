import { describe, it, expect, vi } from 'vitest'
import { upsertErc20Transfers } from '@/db/queries/transfers'
import { buildErc20TransferSeed, buildCreateClaimActionInput, generateEthereumAddress } from '@repo/test-utils'
import { ChainId } from '@repo/types'

// Mock next/cache since it's not available outside Next.js runtime
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('createClaimAction', () => {
  it('creates a claim when transfers exist', async () => {
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

    const result = await createClaimAction(
      buildCreateClaimActionInput({ tokenAddress, counterpartyAddress, chainId: ChainId.ETHEREUM }),
    )

    expect(result?.data?.claimId).toBeDefined()
  })

  it('fails when no transfers exist', async () => {
    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction(
      buildCreateClaimActionInput({
        tokenAddress: generateEthereumAddress().toLowerCase(),
        counterpartyAddress: generateEthereumAddress().toLowerCase(),
        chainId: ChainId.ETHEREUM,
      }),
    )

    expect(result?.serverError).toContain('No transfers found')
  })

  it('returns validation errors for invalid input', async () => {
    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction({
      claimMessage: 'short', // too short
      tokenAddress: 'invalid',
      counterpartyAddress: generateEthereumAddress().toLowerCase(),
      isProverSender: true,
      tokenType: 'erc20',
      chainId: ChainId.ETHEREUM,
    })

    expect(result?.validationErrors).toBeDefined()
  })
})
