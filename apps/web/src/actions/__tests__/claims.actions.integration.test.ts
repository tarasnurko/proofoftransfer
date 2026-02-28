import { describe, it, expect, vi } from 'vitest'
import { upsertErc20Transfers, upsertErc721Transfers, upsertErc1155Transfers } from '@/db/queries/transfers'
import { buildErc20TransferSeed, buildErc721TransferSeed, buildErc1155TransferSeed, buildCreateClaimActionInput, generateEthereumAddress } from '@repo/test-utils'
import { ChainId, TokenType } from '@repo/types'

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

  it('creates ERC-721 claim when transfers exist', async () => {
    const tokenAddress = generateEthereumAddress().toLowerCase()
    const counterpartyAddress = generateEthereumAddress().toLowerCase()

    await upsertErc721Transfers([
      buildErc721TransferSeed({
        tokenAddress,
        recipientAddress: counterpartyAddress,
        chainId: ChainId.ETHEREUM,
        blockTimestamp: 1000,
      }),
    ])

    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction(
      buildCreateClaimActionInput({ tokenAddress, counterpartyAddress, chainId: ChainId.ETHEREUM, tokenType: TokenType.ERC721 }),
    )

    expect(result?.data?.claimId).toBeDefined()
  })

  it('creates ERC-1155 claim when transfers exist', async () => {
    const tokenAddress = generateEthereumAddress().toLowerCase()
    const counterpartyAddress = generateEthereumAddress().toLowerCase()

    await upsertErc1155Transfers([
      buildErc1155TransferSeed({
        tokenAddress,
        recipientAddress: counterpartyAddress,
        chainId: ChainId.ETHEREUM,
        blockTimestamp: 1000,
      }),
    ])

    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction(
      buildCreateClaimActionInput({ tokenAddress, counterpartyAddress, chainId: ChainId.ETHEREUM, tokenType: TokenType.ERC1155 }),
    )

    expect(result?.data?.claimId).toBeDefined()
  })

  it('creates claim with isProverSender=false', async () => {
    const tokenAddress = generateEthereumAddress().toLowerCase()
    const counterpartyAddress = generateEthereumAddress().toLowerCase()

    await upsertErc20Transfers([
      buildErc20TransferSeed({
        tokenAddress,
        senderAddress: counterpartyAddress,
        chainId: ChainId.ETHEREUM,
        blockTimestamp: 1000,
      }),
    ])

    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction(
      buildCreateClaimActionInput({ tokenAddress, counterpartyAddress, chainId: ChainId.ETHEREUM, isProverSender: false }),
    )

    expect(result?.data?.claimId).toBeDefined()
  })

  it('returns validation errors for invalid input', async () => {
    const { createClaimAction } = await import('@/actions/claims.actions')

    const result = await createClaimAction({
      claimMessage: 'short', // too short
      tokenAddress: 'invalid',
      counterpartyAddress: generateEthereumAddress().toLowerCase(),
      isProverSender: true,
      tokenType: TokenType.ERC20,
      chainId: ChainId.ETHEREUM,
    })

    expect(result?.validationErrors).toBeDefined()
  })
})
