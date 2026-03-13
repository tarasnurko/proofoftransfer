import { eq, inArray } from 'drizzle-orm'
import type { Nullable } from '@/types/common.types'
import { db, getClient } from '../client'
import type { DB } from '../index.types'
import { ensCacheTable } from '../schema'
import type { EnsCacheEntity } from '../index.types'
import { entityOrNull } from '../helpers'

export async function getEnsByAddress(address: string, tx?: DB): Promise<Nullable<EnsCacheEntity>> {
  return entityOrNull(
    await getClient(tx)
      .select()
      .from(ensCacheTable)
      .where(eq(ensCacheTable.address, address.toLowerCase()))
      .limit(1)
  )
}

export async function getEnsByAddresses(addresses: string[], tx?: DB): Promise<EnsCacheEntity[]> {
  if (!addresses.length) return []

  const lowercased = addresses.map((a) => a.toLowerCase())

  return getClient(tx)
    .select()
    .from(ensCacheTable)
    .where(inArray(ensCacheTable.address, lowercased))
}

export async function getEnsByName(name: string, tx?: DB): Promise<Nullable<EnsCacheEntity>> {
  return entityOrNull(
    await getClient(tx)
      .select()
      .from(ensCacheTable)
      .where(eq(ensCacheTable.name, name.toLowerCase()))
      .limit(1)
  )
}

interface UpsertEnsCacheParams {
  address: string
  name: Nullable<string>
  expiresAt: Nullable<Date>
}

export async function upsertEnsCache(params: UpsertEnsCacheParams, tx?: DB): Promise<EnsCacheEntity> {
  const result = await getClient(tx)
    .insert(ensCacheTable)
    .values({
      address: params.address.toLowerCase(),
      name: params.name?.toLowerCase() ?? null,
      expiresAt: params.expiresAt,
      resolvedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: ensCacheTable.address,
      set: {
        name: params.name?.toLowerCase() ?? null,
        expiresAt: params.expiresAt,
        resolvedAt: new Date(),
      },
    })
    .returning()

  return result[0]!
}
