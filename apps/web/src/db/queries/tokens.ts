import { db } from '../index'
import { tokens } from '../schema'
import type { InsertTokenEntity, TokenEntity } from '../index.types'
import { eq, and } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../exceptions'

export async function createToken(data: InsertTokenEntity): Promise<TokenEntity> {
  return entityOrError(
    await db
      .insert(tokens)
      .values(data)
      .onConflictDoUpdate({
        target: [tokens.address, tokens.chain_id],
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

export async function getTokenByAddressAndChain(address: string, chainId: number) {
  return entityOrNull(
    await db
      .select()
      .from(tokens)
      .where(and(eq(tokens.address, address.toLowerCase()), eq(tokens.chain_id, chainId)))
      .limit(1)
  )
}
