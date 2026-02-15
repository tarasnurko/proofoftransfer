import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { EnsService } from '@/services/ens'
import { RATE_LIMITS } from '@/services/rate-limit'
import { createRateLimitMiddleware } from '../middleware/rate-limit.middleware'

const resolveEnsQuery = z.object({
  input: z.string().min(1),
})

export const ensRoutes = new Hono()
  .get(
    '/resolve',
    createRateLimitMiddleware('resolveEns', RATE_LIMITS.RESOLVE_ENS),
    zValidator('query', resolveEnsQuery),
    async (c) => {
      const { input } = c.req.valid('query')
      const result = await EnsService.resolveInput(input)

      if (!result) {
        return c.json({ error: 'Could not resolve ENS name or address' }, 404)
      }

      return c.json({ data: result })
    },
  )
