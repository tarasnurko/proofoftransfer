import { NextResponse } from 'next/server'
import { getProofById } from '@/db/queries/proofs'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ proofId: string }> }
) {
  try {
    const { proofId } = await params
    const proof = await getProofById(proofId)

    if (!proof) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
    }

    return NextResponse.json(proof)
  } catch (error) {
    console.error('Error fetching proof:', error)
    return NextResponse.json({ error: 'Failed to fetch proof' }, { status: 500 })
  }
}
