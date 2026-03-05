import { Hono } from 'hono'
import { claimsRoutes } from './routes/claims.routes'
import { ensRoutes } from './routes/ens.routes'
import { tokensRoutes } from './routes/tokens.routes'
import { signatureRoutes } from './routes/signature.routes'
import { blocksRoutes } from './routes/blocks.routes'

export const honoApp = new Hono()
  .basePath('/api')
  .route('/claims', claimsRoutes)
  .route('/ens', ensRoutes)
  .route('/tokens', tokensRoutes)
  .route('/signature', signatureRoutes)
  .route('/blocks', blocksRoutes)

honoApp.onError((err, c) => {
  console.error('API error:', err.message)
  return c.json({ error: err.message }, 500)
})

export type HonoAppType = typeof honoApp
