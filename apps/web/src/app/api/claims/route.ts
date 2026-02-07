import { NextResponse } from 'next/server'
import { getClaims } from '@/db/queries/claims'

const MAX_PAGE_SIZE = 100

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_PAGE_SIZE)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    const result = await getClaims({ limit, offset })
    return NextResponse.json({ data: result.claims, total: result.total })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    )
  }
}
