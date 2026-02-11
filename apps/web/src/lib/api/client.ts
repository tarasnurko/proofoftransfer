import { hc } from 'hono/client'
import type { HonoAppType } from './app'

export const api = hc<HonoAppType>('/')
