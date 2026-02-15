import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = {
  getEnsAddress: vi.fn(),
  getEnsName: vi.fn(),
  readContract: vi.fn(),
}

vi.mock('viem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('viem')>()
  return {
    ...actual,
    createPublicClient: vi.fn(() => mockClient),
  }
})

vi.mock('viem/ens', () => ({
  normalize: (name: string) => name.toLowerCase(),
}))

vi.mock('@/db/queries/ens', () => ({
  getEnsByAddress: vi.fn(),
  getEnsByAddresses: vi.fn(),
  getEnsByName: vi.fn(),
  upsertEnsCache: vi.fn(),
}))

import { getEnsByAddress, getEnsByAddresses, getEnsByName, upsertEnsCache } from '@/db/queries/ens'
import { EnsService } from '../ens.service'

const mockGetEnsByAddress = vi.mocked(getEnsByAddress)
const mockGetEnsByAddresses = vi.mocked(getEnsByAddresses)
const mockGetEnsByName = vi.mocked(getEnsByName)
const mockUpsertEnsCache = vi.mocked(upsertEnsCache)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EnsService', () => {
  describe('resolveAddress', () => {
    it('returns address when ENS resolves', async () => {
      mockClient.getEnsAddress.mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678')

      const result = await EnsService.resolveAddress('vitalik.eth')

      expect(result).toBe('0x1234567890abcdef1234567890abcdef12345678')
    })

    it('returns null when ENS does not resolve', async () => {
      mockClient.getEnsAddress.mockResolvedValue(null)

      const result = await EnsService.resolveAddress('nonexistent.eth')

      expect(result).toBeNull()
    })

    it('returns null on error', async () => {
      mockClient.getEnsAddress.mockRejectedValue(new Error('RPC error'))

      const result = await EnsService.resolveAddress('broken.eth')

      expect(result).toBeNull()
    })
  })

  describe('resolveName', () => {
    it('returns name when reverse lookup succeeds', async () => {
      mockClient.getEnsName.mockResolvedValue('vitalik.eth')

      const result = await EnsService.resolveName('0x1234567890abcdef1234567890abcdef12345678')

      expect(result).toBe('vitalik.eth')
    })

    it('returns null when no reverse record', async () => {
      mockClient.getEnsName.mockResolvedValue(null)

      const result = await EnsService.resolveName('0x1234567890abcdef1234567890abcdef12345678')

      expect(result).toBeNull()
    })

    it('returns null on error', async () => {
      mockClient.getEnsName.mockRejectedValue(new Error('RPC error'))

      const result = await EnsService.resolveName('0x1234567890abcdef1234567890abcdef12345678')

      expect(result).toBeNull()
    })
  })

  describe('getNameExpiry', () => {
    it('returns null for non-second-level .eth names', async () => {
      const result = await EnsService.getNameExpiry('sub.vitalik.eth')

      expect(result).toBeNull()
      expect(mockClient.readContract).not.toHaveBeenCalled()
    })

    it('returns null for non-.eth names', async () => {
      const result = await EnsService.getNameExpiry('vitalik.com')

      expect(result).toBeNull()
    })

    it('returns expiry date for second-level .eth', async () => {
      const futureTimestamp = BigInt(Math.floor(Date.now() / 1000) + 86400)
      mockClient.readContract.mockResolvedValue(futureTimestamp)

      const result = await EnsService.getNameExpiry('vitalik.eth')

      expect(result).toBeInstanceOf(Date)
    })

    it('returns null when expiry is 0', async () => {
      mockClient.readContract.mockResolvedValue(BigInt(0))

      const result = await EnsService.getNameExpiry('vitalik.eth')

      expect(result).toBeNull()
    })

    it('returns null on contract read error', async () => {
      mockClient.readContract.mockRejectedValue(new Error('Contract error'))

      const result = await EnsService.getNameExpiry('vitalik.eth')

      expect(result).toBeNull()
    })
  })

  describe('getCachedEnsName', () => {
    it('returns cached name when fresh', async () => {
      mockGetEnsByAddress.mockResolvedValue({
        address: '0x' + 'a'.repeat(40),
        name: 'cached.eth',
        resolvedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      const result = await EnsService.getCachedEnsName('0x' + 'a'.repeat(40))

      expect(result).toBe('cached.eth')
      expect(mockClient.getEnsName).not.toHaveBeenCalled()
    })

    it('resolves fresh when cache is stale (expired)', async () => {
      mockGetEnsByAddress.mockResolvedValue({
        address: '0x' + 'a'.repeat(40),
        name: 'old.eth',
        resolvedAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() - 1000),
      })
      mockClient.getEnsName.mockResolvedValue('fresh.eth')
      mockClient.readContract.mockResolvedValue(BigInt(0))
      mockUpsertEnsCache.mockResolvedValue({} as never)

      const result = await EnsService.getCachedEnsName('0x' + 'a'.repeat(40))

      expect(result).toBe('fresh.eth')
      expect(mockUpsertEnsCache).toHaveBeenCalled()
    })

    it('resolves fresh when no cache entry exists', async () => {
      mockGetEnsByAddress.mockResolvedValue(null)
      mockClient.getEnsName.mockResolvedValue('new.eth')
      mockClient.readContract.mockResolvedValue(BigInt(0))
      mockUpsertEnsCache.mockResolvedValue({} as never)

      const result = await EnsService.getCachedEnsName('0x' + 'a'.repeat(40))

      expect(result).toBe('new.eth')
    })
  })

  describe('batchGetEnsNames', () => {
    it('returns empty map for empty input', async () => {
      const result = await EnsService.batchGetEnsNames([])

      expect(result.size).toBe(0)
    })

    it('returns cached names without resolving', async () => {
      const addr = '0x' + 'a'.repeat(40)
      mockGetEnsByAddresses.mockResolvedValue([{
        address: addr,
        name: 'cached.eth',
        resolvedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      }])

      const result = await EnsService.batchGetEnsNames([addr])

      expect(result.get(addr)).toBe('cached.eth')
      expect(mockClient.getEnsName).not.toHaveBeenCalled()
    })

    it('resolves stale entries', async () => {
      const addr = '0x' + 'a'.repeat(40)
      mockGetEnsByAddresses.mockResolvedValue([{
        address: addr,
        name: 'old.eth',
        resolvedAt: new Date(Date.now() - 86400000),
        expiresAt: new Date(Date.now() - 1000),
      }])
      mockClient.getEnsName.mockResolvedValue('fresh.eth')
      mockClient.readContract.mockResolvedValue(BigInt(0))
      mockUpsertEnsCache.mockResolvedValue({} as never)

      const result = await EnsService.batchGetEnsNames([addr])

      expect(result.get(addr)).toBe('fresh.eth')
    })

    it('deduplicates addresses', async () => {
      const addr = '0x' + 'a'.repeat(40)
      mockGetEnsByAddresses.mockResolvedValue([{
        address: addr,
        name: 'test.eth',
        resolvedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      }])

      await EnsService.batchGetEnsNames([addr, addr.toUpperCase()])

      expect(mockGetEnsByAddresses).toHaveBeenCalledWith([addr])
    })
  })

  describe('resolveInput', () => {
    it('returns address + cached ENS name for address input', async () => {
      const addr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      mockGetEnsByAddress.mockResolvedValue({
        address: addr.toLowerCase(),
        name: 'vitalik.eth',
        resolvedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      const result = await EnsService.resolveInput(addr)

      expect(result).toEqual({ address: addr, ensName: 'vitalik.eth' })
    })

    it('resolves ENS name to address with cache', async () => {
      const addr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
      mockGetEnsByName.mockResolvedValue({
        address: addr.toLowerCase(),
        name: 'vitalik.eth',
        resolvedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })

      const result = await EnsService.resolveInput('vitalik.eth')

      expect(result).toEqual({
        address: addr.toLowerCase(),
        ensName: 'vitalik.eth',
      })
    })

    it('resolves ENS name via RPC when not cached', async () => {
      mockGetEnsByName.mockResolvedValue(null)
      mockClient.getEnsAddress.mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678')
      mockClient.readContract.mockResolvedValue(BigInt(0))
      mockUpsertEnsCache.mockResolvedValue({} as never)

      const result = await EnsService.resolveInput('new.eth')

      expect(result).toEqual({
        address: '0x1234567890abcdef1234567890abcdef12345678',
        ensName: 'new.eth',
      })
    })

    it('returns null for ENS that does not resolve', async () => {
      mockGetEnsByName.mockResolvedValue(null)
      mockClient.getEnsAddress.mockResolvedValue(null)

      const result = await EnsService.resolveInput('nonexistent.eth')

      expect(result).toBeNull()
    })

    it('returns null for invalid input', async () => {
      const result = await EnsService.resolveInput('not-an-address')

      expect(result).toBeNull()
    })

    it('trims whitespace', async () => {
      const result = await EnsService.resolveInput('  ')

      expect(result).toBeNull()
    })
  })
})
