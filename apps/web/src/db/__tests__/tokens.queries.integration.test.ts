import { describe, it, expect } from 'vitest'
import { createToken, getTokenByAddressAndChain } from '../queries/tokens'
import { buildTokenSeed } from '@repo/test-utils'

describe('tokens queries', () => {
  describe('createToken', () => {
    it('creates a token', async () => {
      const seed = buildTokenSeed()
      const token = await createToken(seed)

      expect(token.id).toBeDefined()
      expect(token.symbol).toBe('TST')
      expect(token.decimals).toBe(18)
    })

    it('upserts on conflict (same address + chainId)', async () => {
      const seed = buildTokenSeed()
      await createToken(seed)

      const updated = await createToken({ ...seed, name: 'Updated Token', symbol: 'UPD' })
      expect(updated.name).toBe('Updated Token')
      expect(updated.symbol).toBe('UPD')
    })
  })

  describe('getTokenByAddressAndChain', () => {
    it('returns token when found', async () => {
      const seed = buildTokenSeed({ address: '0x' + 'f'.repeat(40) })
      await createToken(seed)

      const result = await getTokenByAddressAndChain({
        address: '0x' + 'F'.repeat(40), // tests case-insensitive lookup
        chainId: seed.chainId,
      })

      expect(result).toBeDefined()
      expect(result!.symbol).toBe('TST')
    })

    it('returns null when not found', async () => {
      const result = await getTokenByAddressAndChain({
        address: '0x' + '0'.repeat(40),
        chainId: 999,
      })
      expect(result).toBeNull()
    })
  })
})
