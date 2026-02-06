import { db } from '../client'
import { tokens } from '../schema'
import type { InsertTokenEntity, TokenEntity } from '../index.types'
import type { Nullable } from '@/types'
import { eq, and } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../helpers'

export async function createToken(data: InsertTokenEntity): Promise<TokenEntity> {
  return entityOrError(
    await db
      .insert(tokens)
      .values(data)
      .onConflictDoUpdate({
        target: [tokens.address, tokens.chainId],
        set: {
          name: data.name,
          symbol: data.symbol,
          decimals: data.decimals,
        },
      })
      .returning(),
    'Failed to create token'
  )
}

export async function getTokenByAddressAndChain(
  address: string,
  chainId: number
): Promise<Nullable<TokenEntity>> {
  return entityOrNull(
    await db
      .select()
      .from(tokens)
      .where(and(eq(tokens.address, address.toLowerCase()), eq(tokens.chainId, chainId)))
      .limit(1)
  )
}
