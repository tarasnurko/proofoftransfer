import { describe, it, expect } from 'vitest'
import { getEnsByAddress, getEnsByAddresses, getEnsByName, upsertEnsCache } from '../queries/ens'
import { buildEnsCacheSeed } from '@repo/test-utils'

describe('ens queries', () => {
  describe('upsertEnsCache', () => {
    it('inserts a new entry', async () => {
      const seed = buildEnsCacheSeed()
      const result = await upsertEnsCache({
        address: seed.address,
        name: seed.name,
        expiresAt: seed.expiresAt,
      })

      expect(result.address).toBe(seed.address)
      expect(result.name).toBe(seed.name!.toLowerCase())
      expect(result.resolvedAt).toBeDefined()
    })

    it('updates on conflict (same address)', async () => {
      const seed = buildEnsCacheSeed()
      await upsertEnsCache({
        address: seed.address,
        name: 'old.eth',
        expiresAt: null,
      })

      const updated = await upsertEnsCache({
        address: seed.address,
        name: 'new.eth',
        expiresAt: seed.expiresAt,
      })

      expect(updated.name).toBe('new.eth')
      expect(updated.expiresAt).toEqual(seed.expiresAt)
    })

    it('stores null name', async () => {
      const seed = buildEnsCacheSeed()
      const result = await upsertEnsCache({
        address: seed.address,
        name: null,
        expiresAt: null,
      })

      expect(result.name).toBeNull()
    })

    it('lowercases address and name', async () => {
      const address = '0x' + 'A'.repeat(40)
      const result = await upsertEnsCache({
        address,
        name: 'Vitalik.eth',
        expiresAt: null,
      })

      expect(result.address).toBe(address.toLowerCase())
      expect(result.name).toBe('vitalik.eth')
    })
  })

  describe('getEnsByAddress', () => {
    it('returns entry when found', async () => {
      const seed = buildEnsCacheSeed()
      await upsertEnsCache({ address: seed.address, name: seed.name, expiresAt: null })

      const result = await getEnsByAddress(seed.address)

      expect(result).toBeDefined()
      expect(result!.address).toBe(seed.address)
    })

    it('returns entry with case-insensitive lookup', async () => {
      const address = '0x' + 'a'.repeat(40)
      await upsertEnsCache({ address, name: 'test.eth', expiresAt: null })

      const result = await getEnsByAddress('0x' + 'A'.repeat(40))

      expect(result).toBeDefined()
      expect(result!.name).toBe('test.eth')
    })

    it('returns null when not found', async () => {
      const result = await getEnsByAddress('0x' + '0'.repeat(40))
      expect(result).toBeNull()
    })
  })

  describe('getEnsByAddresses', () => {
    it('returns entries for multiple addresses', async () => {
      const addr1 = ('0x' + 'a'.repeat(40)).toLowerCase()
      const addr2 = ('0x' + 'b'.repeat(40)).toLowerCase()

      await upsertEnsCache({ address: addr1, name: 'one.eth', expiresAt: null })
      await upsertEnsCache({ address: addr2, name: 'two.eth', expiresAt: null })

      const results = await getEnsByAddresses([addr1, addr2])

      expect(results).toHaveLength(2)
    })

    it('returns empty array for empty input', async () => {
      const results = await getEnsByAddresses([])
      expect(results).toEqual([])
    })

    it('returns only matching entries', async () => {
      const addr = ('0x' + 'c'.repeat(40)).toLowerCase()
      await upsertEnsCache({ address: addr, name: 'found.eth', expiresAt: null })

      const results = await getEnsByAddresses([addr, '0x' + 'd'.repeat(40)])

      expect(results).toHaveLength(1)
      expect(results[0]!.name).toBe('found.eth')
    })
  })

  describe('getEnsByName', () => {
    it('returns entry when found', async () => {
      const seed = buildEnsCacheSeed()
      await upsertEnsCache({ address: seed.address, name: 'lookup.eth', expiresAt: null })

      const result = await getEnsByName('lookup.eth')

      expect(result).toBeDefined()
      expect(result!.address).toBe(seed.address)
    })

    it('returns entry with case-insensitive lookup', async () => {
      const seed = buildEnsCacheSeed()
      await upsertEnsCache({ address: seed.address, name: 'case.eth', expiresAt: null })

      const result = await getEnsByName('Case.eth')

      expect(result).toBeDefined()
    })

    it('returns null when not found', async () => {
      const result = await getEnsByName('nonexistent.eth')
      expect(result).toBeNull()
    })
  })
})
