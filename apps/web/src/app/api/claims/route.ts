import { NextResponse } from 'next/server'
import { getClaims } from '@/db/queries/claims'

export async function GET() {
  try {
    const result = await getClaims({ limit: 100, offset: 0 })
    return NextResponse.json({ data: result.claims, total: result.total })
  } catch (error) {
    console.error('Error fetching claims:', error)
    return NextResponse.json(
      { error: 'Failed to fetch claims' },
      { status: 500 }
    )
  }
}
