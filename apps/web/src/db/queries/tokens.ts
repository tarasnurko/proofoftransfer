import { getClient } from '../client'
import type { DB } from '../index.types'
import { tokensTable } from '../schema'
import type { InsertTokenEntity, TokenEntity } from '../index.types'
import type { Nullable } from '@/types'
import { eq, and } from 'drizzle-orm'
import { entityOrError, entityOrNull } from '../helpers'

export async function createToken(data: InsertTokenEntity, tx?: DB): Promise<TokenEntity> {
  return entityOrError(
    await getClient(tx)
      .insert(tokensTable)
      .values(data)
      .onConflictDoUpdate({
        target: [tokensTable.address, tokensTable.chainId],
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

interface GetTokenByAddressAndChainParams {
  address: string
  chainId: number
}

export async function getTokenByAddressAndChain(
  { address, chainId }: GetTokenByAddressAndChainParams
): Promise<Nullable<TokenEntity>> {
  return entityOrNull(
    await getClient()
      .select()
      .from(tokensTable)
      .where(and(eq(tokensTable.address, address.toLowerCase()), eq(tokensTable.chainId, chainId)))
      .limit(1)
  )
}
