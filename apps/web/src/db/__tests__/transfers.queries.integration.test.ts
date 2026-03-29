import { describe, it, expect } from 'vitest'
import {
  upsertErc20Transfers, getErc20Transfers,
  upsertErc721Transfers, getErc721Transfers,
  upsertErc1155Transfers, getErc1155Transfers,
} from '../queries/transfers'
import { buildErc20TransferSeed, buildErc721TransferSeed, buildErc1155TransferSeed } from '@repo/test-utils'

describe('transfers queries', () => {
  describe('upsertErc20Transfers', () => {
    it('inserts new transfers', async () => {
      const transfers = [
        buildErc20TransferSeed({ txHash: '0x' + 'a'.repeat(64) }),
        buildErc20TransferSeed({ txHash: '0x' + 'b'.repeat(64) }),
      ]

      const result = await upsertErc20Transfers(transfers)
      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBeDefined()
    })

    it('upserts on conflict (same unique key)', async () => {
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
          txHash: '0x' + '1'.repeat(64),
        }),
        buildErc20TransferSeed({
          tokenAddress,
          recipientAddress,
          chainId: 1,
          blockTimestamp: 2000,
          txHash: '0x' + '2'.repeat(64),
        }),
        buildErc20TransferSeed({
          tokenAddress: '0x' + 'c'.repeat(40),
          recipientAddress,
          chainId: 1,
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
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 500, chainId: 1, txHash: '0x' + '1'.repeat(64) }),
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 1500, chainId: 1, txHash: '0x' + '2'.repeat(64) }),
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 2500, chainId: 1, txHash: '0x' + '3'.repeat(64) }),
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
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 3000, chainId: 1, txHash: '0x' + '1'.repeat(64) }),
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 1000, chainId: 1, txHash: '0x' + '2'.repeat(64) }),
        buildErc20TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 2000, chainId: 1, txHash: '0x' + '3'.repeat(64) }),
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

  describe('upsertErc721Transfers', () => {
    it('inserts new transfers', async () => {
      const transfers = [
        buildErc721TransferSeed({ txHash: '0x' + 'a'.repeat(64) }),
        buildErc721TransferSeed({ txHash: '0x' + 'b'.repeat(64) }),
      ]

      const result = await upsertErc721Transfers(transfers)
      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBeDefined()
    })

    it('upserts on conflict (same unique key)', async () => {
      const seed = buildErc721TransferSeed()
      await upsertErc721Transfers([seed])
      const result = await upsertErc721Transfers([seed])

      expect(result).toHaveLength(1)
    })

    it('returns empty array for empty input', async () => {
      const result = await upsertErc721Transfers([])
      expect(result).toEqual([])
    })
  })

  describe('getErc721Transfers', () => {
    it('returns transfers matching constraints', async () => {
      const tokenAddress = '0x' + 'd'.repeat(40)
      const recipientAddress = '0x' + 'e'.repeat(40)

      await upsertErc721Transfers([
        buildErc721TransferSeed({ tokenAddress, recipientAddress, chainId: 1, txHash: '0x' + '4'.repeat(64) }),
        buildErc721TransferSeed({ tokenAddress, recipientAddress, chainId: 1, txHash: '0x' + '5'.repeat(64) }),
        buildErc721TransferSeed({ tokenAddress: '0x' + 'f'.repeat(40), recipientAddress, chainId: 1, txHash: '0x' + '6'.repeat(64) }),
      ])

      const result = await getErc721Transfers({ chainId: 1, tokenAddress, recipientAddress })
      expect(result).toHaveLength(2)
    })

    it('filters by timestamp range', async () => {
      const tokenAddress = '0x' + 'd'.repeat(40)
      const recipientAddress = '0x' + 'e'.repeat(40)

      await upsertErc721Transfers([
        buildErc721TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 500, chainId: 1, txHash: '0x' + '7'.repeat(64) }),
        buildErc721TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 1500, chainId: 1, txHash: '0x' + '8'.repeat(64) }),
        buildErc721TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 2500, chainId: 1, txHash: '0x' + '9'.repeat(64) }),
      ])

      const result = await getErc721Transfers({
        chainId: 1,
        tokenAddress,
        recipientAddress,
        fromTimestamp: 1000,
        toTimestamp: 2000,
      })

      expect(result).toHaveLength(1)
      expect(result[0]!.blockTimestamp).toBe(1500)
    })
  })

  describe('upsertErc1155Transfers', () => {
    it('inserts new transfers', async () => {
      const transfers = [
        buildErc1155TransferSeed({ txHash: '0x' + 'a'.repeat(64) }),
        buildErc1155TransferSeed({ txHash: '0x' + 'b'.repeat(64) }),
      ]

      const result = await upsertErc1155Transfers(transfers)
      expect(result).toHaveLength(2)
      expect(result[0]!.id).toBeDefined()
    })

    it('upserts on conflict (same unique key)', async () => {
      const seed = buildErc1155TransferSeed()
      await upsertErc1155Transfers([seed])
      const result = await upsertErc1155Transfers([seed])

      expect(result).toHaveLength(1)
    })

    it('returns empty array for empty input', async () => {
      const result = await upsertErc1155Transfers([])
      expect(result).toEqual([])
    })
  })

  describe('getErc1155Transfers', () => {
    it('returns transfers matching constraints', async () => {
      const tokenAddress = '0x' + 'a1'.repeat(20)
      const recipientAddress = '0x' + 'b1'.repeat(20)

      await upsertErc1155Transfers([
        buildErc1155TransferSeed({ tokenAddress, recipientAddress, chainId: 1, txHash: '0x' + 'c1'.repeat(32) }),
        buildErc1155TransferSeed({ tokenAddress, recipientAddress, chainId: 1, txHash: '0x' + 'd1'.repeat(32) }),
        buildErc1155TransferSeed({ tokenAddress: '0x' + 'e1'.repeat(20), recipientAddress, chainId: 1, txHash: '0x' + 'f1'.repeat(32) }),
      ])

      const result = await getErc1155Transfers({ chainId: 1, tokenAddress, recipientAddress })
      expect(result).toHaveLength(2)
    })

    it('filters by timestamp range', async () => {
      const tokenAddress = '0x' + 'a1'.repeat(20)
      const recipientAddress = '0x' + 'b1'.repeat(20)

      await upsertErc1155Transfers([
        buildErc1155TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 500, chainId: 1, txHash: '0x' + 'a2'.repeat(32) }),
        buildErc1155TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 1500, chainId: 1, txHash: '0x' + 'b2'.repeat(32) }),
        buildErc1155TransferSeed({ tokenAddress, recipientAddress, blockTimestamp: 2500, chainId: 1, txHash: '0x' + 'c2'.repeat(32) }),
      ])

      const result = await getErc1155Transfers({
        chainId: 1,
        tokenAddress,
        recipientAddress,
        fromTimestamp: 1000,
        toTimestamp: 2000,
      })

      expect(result).toHaveLength(1)
      expect(result[0]!.blockTimestamp).toBe(1500)
    })
  })

})
