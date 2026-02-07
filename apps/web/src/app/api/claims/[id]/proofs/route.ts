import { NextResponse } from 'next/server'
import { getProofsByClaimId } from '@/db/queries/proofs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const proofs = await getProofsByClaimId(id)
    return NextResponse.json(proofs)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch proofs' }, { status: 500 })
  }
}
