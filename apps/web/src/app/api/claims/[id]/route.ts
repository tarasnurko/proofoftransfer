import { NextResponse } from 'next/server'
import { getClaimById } from '@/db/queries/claims'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const claim = await getClaimById(id)

    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    return NextResponse.json(claim)
  } catch (error) {
    console.error('Error fetching claim:', error)
    return NextResponse.json({ error: 'Failed to fetch claim' }, { status: 500 })
  }
}
