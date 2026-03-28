import { createPublicClient, http, isAddress, keccak256, toHex, type Address, type PublicClient } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'
import { MS_PER_DAY, MS_PER_SECOND } from '@/constants'
import type { Nullable } from '@/types/common.types'
import { getEnsByAddress, getEnsByAddresses, getEnsByName, upsertEnsCache } from '@/db/queries/ens'

// ── Constants ──

const FALLBACK_TTL_MS = 30 * MS_PER_DAY

const ENS_BASE_REGISTRAR_ADDRESS = '0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85' as const

const NAME_EXPIRES_ABI = [
  {
    name: 'nameExpires',
    type: 'function',
    inputs: [{ name: 'id', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

// ── Client ──

let mainnetClient: Nullable<PublicClient> = null

function getMainnetClient(): PublicClient {
  if (!mainnetClient) {
    mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })
  }
  return mainnetClient
}

// ── Cache helpers ──

function isCacheStale(resolvedAt: Date, expiresAt: Nullable<Date>): boolean {
  const now = Date.now()

  if (expiresAt) {
    return now > expiresAt.getTime()
  }

  return now - resolvedAt.getTime() > FALLBACK_TTL_MS
}

function isSecondLevelEth(name: string): boolean {
  const parts = name.split('.')
  return parts.length === 2 && parts[1] === 'eth'
}

// ── Service ──

export interface ResolveInputResult {
  address: Address
  ensName: Nullable<string>
}

export class EnsService {
  static async resolveAddress(ensName: string): Promise<Nullable<Address>> {
    const client = getMainnetClient()

    try {
      const address = await client.getEnsAddress({ name: normalize(ensName) })
      return address ?? null
    } catch (error) {
      console.error('ENS resolveAddress failed:', { ensName, error })
      return null
    }
  }

  static async resolveName(address: Address): Promise<Nullable<string>> {
    const client = getMainnetClient()

    try {
      const name = await client.getEnsName({ address })
      return name ?? null
    } catch (error) {
      console.error('ENS resolveName failed:', { address, error })
      return null
    }
  }

  static async getNameExpiry(ensName: string): Promise<Nullable<Date>> {
    if (!isSecondLevelEth(ensName)) return null

    const client = getMainnetClient()
    const label = ensName.split('.')[0]!
    const labelHash = keccak256(toHex(label))

    try {
      const expiryTimestamp = await client.readContract({
        address: ENS_BASE_REGISTRAR_ADDRESS,
        abi: NAME_EXPIRES_ABI,
        functionName: 'nameExpires',
        args: [BigInt(labelHash)],
      })

      if (!expiryTimestamp) return null

      return new Date(Number(expiryTimestamp) * MS_PER_SECOND)
    } catch (error) {
      console.error('ENS getNameExpiry failed:', { ensName, error })
      return null
    }
  }

  static async getCachedEnsName(address: string): Promise<Nullable<string>> {
    const cached = await getEnsByAddress(address)

    if (cached && !isCacheStale(cached.resolvedAt, cached.expiresAt)) {
      return cached.name
    }

    const name = await this.resolveName(address as Address)
    const expiresAt = name ? await this.getNameExpiry(name) : null

    await upsertEnsCache({ address, name, expiresAt })

    return name
  }

  static async batchGetEnsNames(addresses: string[]): Promise<Map<string, Nullable<string>>> {
    const result = new Map<string, Nullable<string>>()
    if (!addresses.length) return result

    const unique = [...new Set(addresses.map((a) => a.toLowerCase()))]
    const cached = await getEnsByAddresses(unique)

    const staleOrMissing: string[] = []
    const cachedByAddress = new Map(cached.map((c) => [c.address, c]))

    for (const addr of unique) {
      const entry = cachedByAddress.get(addr)

      if (entry && !isCacheStale(entry.resolvedAt, entry.expiresAt)) {
        result.set(addr, entry.name)
      } else {
        staleOrMissing.push(addr)
      }
    }

    const resolutions = await Promise.allSettled(
      staleOrMissing.map(async (addr) => {
        const name = await this.resolveName(addr as Address)
        const expiresAt = name ? await this.getNameExpiry(name) : null
        await upsertEnsCache({ address: addr, name, expiresAt })
        return { addr, name }
      })
    )

    for (const res of resolutions) {
      if (res.status === 'fulfilled') {
        result.set(res.value.addr, res.value.name)
      }
    }

    return result
  }

  static async resolveInput(input: string): Promise<Nullable<ResolveInputResult>> {
    const trimmed = input.trim()

    if (isAddress(trimmed)) {
      const address = trimmed as Address
      const name = await this.getCachedEnsName(address)
      return { address, ensName: name }
    }

    if (trimmed.endsWith('.eth')) {
      const cached = await getEnsByName(trimmed)
      if (cached && !isCacheStale(cached.resolvedAt, cached.expiresAt)) {
        return { address: cached.address as Address, ensName: cached.name }
      }

      const address = await this.resolveAddress(trimmed)
      if (!address) return null

      const expiresAt = await this.getNameExpiry(trimmed)
      await upsertEnsCache({ address, name: trimmed, expiresAt })

      return { address, ensName: trimmed.toLowerCase() }
    }

    return null
  }
}
