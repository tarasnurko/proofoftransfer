import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { etherscanService } from '@/services/etherscan'

const blockNumberQuerySchema = z.object({
  timestamp: z.string().regex(/^\d+$/).transform(Number),
  chainId: z.string().regex(/^\d+$/).transform(Number),
})

export const blocksRoutes = new Hono()
  .get('/block-number', zValidator('query', blockNumberQuerySchema), async (c) => {
    const { timestamp, chainId } = c.req.valid('query')
    const blockNumber = await etherscanService.getBlockByTimestamp(chainId, timestamp)
    return c.json({ blockNumber })
  })
