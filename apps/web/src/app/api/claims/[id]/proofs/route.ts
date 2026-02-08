import { NextResponse } from 'next/server'
import { getProofsByClaimId } from '@/db/queries/proofs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const page = Math.max(Number(searchParams.get('page') ?? 1), 1)
    const limit = Math.max(Number(searchParams.get('limit') ?? 9), 1)
    const search = searchParams.get('search') || undefined
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' as const : 'desc' as const

    const offset = (page - 1) * limit

    const result = await getProofsByClaimId(id, { limit, offset, search, sortOrder })
    return NextResponse.json(result)
  } catch (error) {
    console.error('GET /api/claims/[id]/proofs:', error)
    return NextResponse.json({ error: 'Failed to fetch proofs' }, { status: 500 })
  }
}
