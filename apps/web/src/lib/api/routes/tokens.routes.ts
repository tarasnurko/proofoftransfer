import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Address } from 'viem'
import { createToken, getTokenByAddressAndChain } from '@/db/queries/tokens'
import type { InsertTokenEntity } from '@/db/index.types'
import { BlockchainService } from '@/services/blockchain/blockchain.service'

const tokenQuery = z.object({
  tokenAddress: z.string(),
  chainId: z.coerce.number(),
})

export async function fetchAndStoreToken(tokenAddress: string, chainId: number) {
  const existing = await getTokenByAddressAndChain({ address: tokenAddress, chainId })
  if (existing) return existing

  const { name, symbol, decimals } = await BlockchainService.getTokenMetadata(
    tokenAddress as Address,
    chainId,
  )

  const data: InsertTokenEntity = {
    address: tokenAddress.toLowerCase(),
    chainId,
    name,
    symbol,
    decimals,
  }

  return createToken(data)
}

export const tokensRoutes = new Hono()
  .get(
    '/',
    zValidator('query', tokenQuery),
    async (c) => {
      const { tokenAddress, chainId } = c.req.valid('query')
      const data = await fetchAndStoreToken(tokenAddress, chainId)
      return c.json({ data })
    },
  )
