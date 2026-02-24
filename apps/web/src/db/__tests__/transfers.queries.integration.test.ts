import { describe, it, expect } from 'vitest'
import { upsertErc20Transfers, getErc20Transfers } from '../queries/transfers'
import { buildErc20TransferSeed } from '@repo/test-utils'

describe('transfers queries', () => {
  describe('upsertErc20Transfers', () => {
    it('inserts new transfers', async () => {
      const transfers = [
        buildErc20TransferSeed({ logIndex: 0, txHash: '0x' + 'a'.repeat(64) }),
        buildErc20TransferSeed({ logIndex: 1, txHash: '0x' + 'b'.repeat(64) }),
      ]

      const result = await upsertErc20Transfers(transfers)
      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBeDefined()
    })

    it('upserts on conflict (same chain + txHash + logIndex)', async () => {
      const seed = buildErc20TransferSeed()
      await upsertErc20Transfers([seed])
      const result = await upsertErc20Transfers([seed])

      expect(result).toHaveLength(1)
    })

    it('returns empty array for empty input', async () => {
      const result = await upsertErc20Transfers([])
      expect(result).toEqual([])
    })
  })

  describe('getErc20Transfers', () => {
    it('returns transfers matching constraints', async () => {
      const tokenAddress = '0x' + 'a'.repeat(40)
      const recipientAddress = '0x' + 'b'.repeat(40)

      await upsertErc20Transfers([
        buildErc20TransferSeed({
          tokenAddress,
          recipientAddress,
          chainId: 1,
          blockTimestamp: 1000,
          logIndex: 0,
          txHash: '0x' + '1'.repeat(64),
        }),
        buildErc20TransferSeed({
          tokenAddress,
          recipientAddress,
          chainId: 1,
          blockTimestamp: 2000,
          logIndex: 0,
          txHash: '0x' + '2'.repeat(64),
        }),
        buildErc20TransferSeed({
          tokenAddress: '0x' + 'c'.repeat(40),
          recipientAddress,
          chainId: 1,
          logIndex: 0,
          txHash: '0x' + '3'.repeat(64),
        }),
      ])

      const result = await getErc20Transfers({
        chainId: 1,
        tokenAddress,
        recipientAddress,
      })

      expect(result).toHaveLength(2)
    })

    it('filters by timestamp range', async () => {
      const tokenAddress = '0x' + 'a'.repeat(40)
      const recipientAddress = '0x' + 'b'.repeat(40)

      await upsertErc20Transfers([
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 500, chainId: 1, logIndex: 0, txHash: '0x' + '1'.repeat(64) }),
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 1500, chainId: 1, logIndex: 0, txHash: '0x' + '2'.repeat(64) }),
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 2500, chainId: 1, logIndex: 0, txHash: '0x' + '3'.repeat(64) }),
      ])

      const result = await getErc20Transfers({
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

      await upsertErc20Transfers([
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 3000, chainId: 1, logIndex: 0, txHash: '0x' + '1'.repeat(64) }),
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 1000, chainId: 1, logIndex: 0, txHash: '0x' + '2'.repeat(64) }),
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 2000, chainId: 1, logIndex: 0, txHash: '0x' + '3'.repeat(64) }),
      ])

      const result = await getErc20Transfers({
        chainId: 1,
        tokenAddress,
        recipientAddress,
      })

      expect(result[0]!.blockTimestamp).toBe(1000)
      expect(result[1]!.blockTimestamp).toBe(2000)
      expect(result[2]!.blockTimestamp).toBe(3000)
    })
  })

})
