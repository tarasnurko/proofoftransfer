import { describe, it, expect } from 'vitest'
import { server } from '@/__tests__/setup.integration'
import { createEtherscanHandlers, generateTransfer } from '@repo/test-utils'
import { EtherscanService } from '../etherscan.service'

describe('EtherscanService', () => {
  const service = new EtherscanService()
  const address = '0x' + 'a'.repeat(40)
  const tokenAddress = '0x' + 'b'.repeat(40)

  describe('getERC20Transfers', () => {
    it('returns transfers from MSW mock', async () => {
      const mockTransfers = [
        generateTransfer({ from: '0x' + 'c'.repeat(40), to: address, tokenAddress }),
        generateTransfer({ from: '0x' + 'd'.repeat(40), to: address, tokenAddress }),
      ]
      // Override timeStamp to be within range
      mockTransfers.forEach((t) => { t.timeStamp = '1500' })

      server.use(
        ...createEtherscanHandlers({
          transfers: mockTransfers,
          blockByTimestamp: { '1000': '100', '2000': '200' },
        }),
      )

      const result = await service.getERC20Transfers({
        chainId: 1,
        tokenAddress,
        address,
        fromTimestamp: 1000,
        toTimestamp: 2000,
      })

      expect(result).toHaveLength(2)
    })

    it('returns empty when no transactions found', async () => {
      server.use(...createEtherscanHandlers({ transfers: [] }))

      const result = await service.getERC20Transfers({
        chainId: 1,
        tokenAddress,
        address,
      })

      expect(result).toEqual([])
    })

    it('throws on invalid API key', async () => {
      const badService = new EtherscanService()
      Object.defineProperty(badService, 'apiKey', { value: 'invalid-key' })

      server.use(...createEtherscanHandlers())

      await expect(
        badService.getERC20Transfers({ chainId: 1, tokenAddress, address }),
      ).rejects.toThrow('Invalid or missing Etherscan API key')
    })

    it('filters transfers by recipient and token address', async () => {
      const wrongRecipient = '0x' + 'e'.repeat(40)
      const mockTransfers = [
        { ...generateTransfer({ to: address, tokenAddress }), timeStamp: '1500' },
        { ...generateTransfer({ to: wrongRecipient, tokenAddress }), timeStamp: '1500' },
      ]

      server.use(
        ...createEtherscanHandlers({
          transfers: mockTransfers,
          blockByTimestamp: { '1000': '100', '2000': '200' },
        }),
      )

      const result = await service.getERC20Transfers({
        chainId: 1,
        tokenAddress,
        address,
        fromTimestamp: 1000,
        toTimestamp: 2000,
      })

      expect(result).toHaveLength(1)
    })
  })

  describe('getBlockByTimestamp', () => {
    it('returns block number for timestamp', async () => {
      server.use(
        ...createEtherscanHandlers({
          blockByTimestamp: { '1700000000': '18500000' },
        }),
      )

      const result = await service.getBlockByTimestamp(1, 1700000000)
      expect(result).toBe(18500000)
    })
  })
})
