import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { etherscanService } from '@/services/etherscan'
import { createRateLimitMiddleware } from '../middleware/rate-limit.middleware'
import { RATE_LIMITS } from '@/services/rate-limit'

const blockNumberQuerySchema = z.object({
  timestamp: z.string().regex(/^\d+$/).transform(Number),
  chainId: z.string().regex(/^\d+$/).transform(Number),
})

export const blocksRoutes = new Hono()
  .get(
    '/block-number',
    createRateLimitMiddleware('getBlockNumber', RATE_LIMITS.GET_ETHERSCAN_TRANSFERS),
    zValidator('query', blockNumberQuerySchema),
    async (c) => {
      const { timestamp, chainId } = c.req.valid('query')
      const blockNumber = await etherscanService.getBlockByTimestamp(chainId, timestamp)
      return c.json({ blockNumber })
    },
  )
