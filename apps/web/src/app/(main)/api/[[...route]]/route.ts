import { handle } from 'hono/vercel'
import { honoApp } from '@/lib/api/app'

export const dynamic = 'force-dynamic'

export const GET = handle(honoApp)
export const POST = handle(honoApp)
