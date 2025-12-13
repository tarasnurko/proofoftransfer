import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { proofs } from '@/db/schema'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      message,
      tokenAddress,
      receiverAddress,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = body

    // Validate required fields
    if (
      !tokenAddress ||
      !receiverAddress ||
      !startDate ||
      !endDate
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const logs: string[] = []
    logs.push('Preparing proof data... ⏳')

    // For now, store a placeholder proof
    // Actual proof generation will be done via standalone script
    const placeholderProof = '0x' + '0'.repeat(128)
    const placeholderPublicInputs = ['0x' + '0'.repeat(64), '0x' + '0'.repeat(64)]
    const placeholderMessageHash = '0x' + '0'.repeat(64)

    logs.push('⚠️  Note: Proof generation via standalone script required')
    logs.push('Storing proof data in database... ⏳')

    // Store proof in database
    const [newProof] = await db
      .insert(proofs)
      .values({
        recipient: receiverAddress,
        tokenAddress,
        startDate: new Date(startDate * 1000),
        endDate: new Date(endDate * 1000),
        minAmount: minAmount || '0',
        maxAmount: maxAmount || '999999999999999999',
        proof: placeholderProof,
        publicInputs: JSON.stringify(placeholderPublicInputs),
        globalTransfersRoot: placeholderPublicInputs[0],
        addressCommitment: placeholderPublicInputs[1],
        messageHash: placeholderMessageHash,
        message: message || null,
      })
      .returning()

    logs.push(`Proof record created with ID: ${newProof.id} ✅`)
    logs.push('To generate actual proof, run: yarn generate-proof --id=' + newProof.id)

    return NextResponse.json({
      success: true,
      proofId: newProof.id,
      logs,
      note: 'Proof placeholder created. Run standalone script to generate actual proof.',
    })
  } catch (error: any) {
    console.error('Error storing proof data:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to store proof data' },
      { status: 500 }
    )
  }
}
