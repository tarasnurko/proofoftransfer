import { NextResponse } from 'next/server'
import { getProofById } from '@/db/queries/proofs'
import { getVerificationStats } from '@/db/queries/verifications'

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

    const stats = await getVerificationStats(proofId)

    return NextResponse.json({
      ...proof,
      verificationStats: {
        successful: stats.successful,
        failed: stats.failed,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch proof' }, { status: 500 })
  }
}
