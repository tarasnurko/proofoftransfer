/// <reference types="vitest/globals" />
import { setupServer } from 'msw/node'
import { createEtherscanHandlers, truncateAll } from '@repo/test-utils'
import { db } from '@/db/client'

const server = setupServer(...createEtherscanHandlers())

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

beforeEach(async () => {
  server.resetHandlers()
  await truncateAll(db)
})

afterAll(() => {
  server.close()
})

export { server }
