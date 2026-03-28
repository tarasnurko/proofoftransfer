import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'
import { claimsRoutes } from './routes/claims.routes'
import { ensRoutes } from './routes/ens.routes'
import { tokensRoutes } from './routes/tokens.routes'
import { blocksRoutes } from './routes/blocks.routes'

export const honoApp = new Hono()
  .basePath('/api')
  .use(cors({ origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' }))
  .use(bodyLimit({ maxSize: 3 * 1024 * 1024 }))
  .route('/claims', claimsRoutes)
  .route('/ens', ensRoutes)
  .route('/tokens', tokensRoutes)
  .route('/blocks', blocksRoutes)

honoApp.onError((err, c) => {
  console.error('API error:', err.message, err.stack)
  return c.json({ error: err.message }, 500)
})

export type HonoAppType = typeof honoApp
