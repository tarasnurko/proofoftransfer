import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { Address } from 'viem'
import { Barretenberg } from '@aztec/bb.js'
import { processSignature } from '@repo/circuit-utils'

const processSignatureBody = z.object({
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
})

export const signatureRoutes = new Hono()
  .post(
    '/process',
    zValidator('json', processSignatureBody),
    async (c) => {
      const { signature } = c.req.valid('json')
      const api = await Barretenberg.new({ threads: 1 })
      const result = await processSignature(signature as Address, api)

      return c.json({
        nullifier: result.nullifier,
        fullSignature: result.fullSignature,
      })
    },
  )
