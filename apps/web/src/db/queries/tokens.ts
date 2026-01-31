import { db } from '../index'
import { tokens } from '../schema'
import type { NewToken } from '../schema'
import { eq, and } from 'drizzle-orm'

export async function createToken(data: NewToken) {
  try {
    const [token] = await db
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
      .returning()
    return { success: true, data: token }
  } catch (error) {
    console.error('Error creating token:', error)
    return { success: false, error: 'Failed to create token' }
  }
}

export async function getTokenByAddressAndChain(address: string, chainId: number) {
  try {
    const [token] = await db
      .select()
      .from(tokens)
      .where(and(eq(tokens.address, address.toLowerCase()), eq(tokens.chain_id, chainId)))
      .limit(1)

    return { success: true, data: token ?? null }
  } catch (error) {
    console.error('Error fetching token:', error)
    return { success: false, error: 'Failed to fetch token' }
  }
}
