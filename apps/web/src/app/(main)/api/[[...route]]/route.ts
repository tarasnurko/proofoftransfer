import { handle } from 'hono/vercel'
import { honoApp } from '@/lib/api/app'

export const GET = handle(honoApp)
export const POST = handle(honoApp)
