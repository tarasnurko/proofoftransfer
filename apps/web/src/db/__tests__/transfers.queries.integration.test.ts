import { describe, it, expect } from 'vitest'
import { upsertTransfers, getTransfersForClaim, getTransfersByConstraints } from '../queries/transfers'
import { createClaim } from '../queries/claims'
import { buildClaimSeed, buildTransferSeed } from '@repo/test-utils'

describe('transfers queries', () => {
  describe('upsertTransfers', () => {
    it('inserts new transfers', async () => {
      const transfers = [
        buildTransferSeed({ logIndex: 0, txHash: '0x' + 'a'.repeat(64) }),
        buildTransferSeed({ logIndex: 1, txHash: '0x' + 'b'.repeat(64) }),
      ]

      const result = await upsertTransfers(transfers)
      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBeDefined()
    })

    it('upserts on conflict (same chain + txHash + logIndex)', async () => {
      const seed = buildTransferSeed()
      await upsertTransfers([seed])
      const result = await upsertTransfers([seed])

      expect(result).toHaveLength(1)
    })

    it('returns empty array for empty input', async () => {
      const result = await upsertTransfers([])
      expect(result).toEqual([])
    })
  })

  describe('getTransfersByConstraints', () => {
    it('returns transfers matching constraints', async () => {
      const tokenAddress = '0x' + 'a'.repeat(40)
      const recipientAddress = '0x' + 'b'.repeat(40)

      await upsertTransfers([
        buildTransferSeed({
          tokenAddress,
          recipientAddress,
          chainId: 1,
          blockTimestamp: 1000,
          logIndex: 0,
          txHash: '0x' + '1'.repeat(64),
        }),
        buildTransferSeed({
          tokenAddress,
          recipientAddress,
          chainId: 1,
          blockTimestamp: 2000,
          logIndex: 0,
          txHash: '0x' + '2'.repeat(64),
        }),
        buildTransferSeed({
          tokenAddress: '0x' + 'c'.repeat(40),
          recipientAddress,
          chainId: 1,
          logIndex: 0,
          txHash: '0x' + '3'.repeat(64),
        }),
      ])

      const result = await getTransfersByConstraints({
        chainId: 1,
        tokenAddress,
        recipientAddress,
      })

      expect(result).toHaveLength(2)
    })

    it('filters by timestamp range', async () => {
      const tokenAddress = '0x' + 'a'.repeat(40)
      const recipientAddress = '0x' + 'b'.repeat(40)

      await upsertTransfers([
        buildTransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 500, chainId: 1, logIndex: 0, txHash: '0x' + '1'.repeat(64) }),
        buildTransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 1500, chainId: 1, logIndex: 0, txHash: '0x' + '2'.repeat(64) }),
        buildTransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 2500, chainId: 1, logIndex: 0, txHash: '0x' + '3'.repeat(64) }),
      ])

      const result = await getTransfersByConstraints({
        chainId: 1,
        tokenAddress,
        recipientAddress,
        fromTimestamp: 1000,
        toTimestamp: 2000,
      })

      expect(result).toHaveLength(1)
      expect(result[0]!.blockTimestamp).toBe(1500)
    })

    it('orders by blockTimestamp', async () => {
      const tokenAddress = '0x' + 'a'.repeat(40)
      const recipientAddress = '0x' + 'b'.repeat(40)

      await upsertTransfers([
        buildTransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 3000, chainId: 1, logIndex: 0, txHash: '0x' + '1'.repeat(64) }),
        buildTransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 1000, chainId: 1, logIndex: 0, txHash: '0x' + '2'.repeat(64) }),
        buildTransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 2000, chainId: 1, logIndex: 0, txHash: '0x' + '3'.repeat(64) }),
      ])

      const result = await getTransfersByConstraints({
        chainId: 1,
        tokenAddress,
        recipientAddress,
      })

      expect(result[0]!.blockTimestamp).toBe(1000)
      expect(result[1]!.blockTimestamp).toBe(2000)
      expect(result[2]!.blockTimestamp).toBe(3000)
    })
  })

  describe('getTransfersForClaim', () => {
    it('returns transfers matching claim constraints', async () => {
      const tokenAddress = '0x' + 'a'.repeat(40)
      const recipientAddress = '0x' + 'b'.repeat(40)

      await upsertTransfers([
        buildTransferSeed({ tokenAddress, recipientAddress, chainId: 1, blockTimestamp: 1000, logIndex: 0, txHash: '0x' + '1'.repeat(64) }),
      ])

      const claim = await createClaim(buildClaimSeed({
        tokenAddress,
        recipientAddress,
        chainId: 1,
        fromBlockTimestamp: 0,
        toBlockTimestamp: 0,
      }))

      const result = await getTransfersForClaim(claim.id)
      expect(result).toHaveLength(1)
    })

    it('throws for non-existent claim', async () => {
      await expect(
        getTransfersForClaim('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Claim not found')
    })
  })
})
