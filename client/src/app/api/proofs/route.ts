import { db } from '@/db'
import { proofs } from '@/db/schema'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      recipient,
      tokenAddress,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      proof,
      publicInputs,
      globalTransfersRoot,
      addressCommitment,
      messageHash,
      message,
    } = body

    // Validate required fields
    if (
      !recipient ||
      !tokenAddress ||
      !startDate ||
      !endDate ||
      !minAmount ||
      !maxAmount ||
      !proof ||
      !publicInputs ||
      !globalTransfersRoot ||
      !addressCommitment ||
      !messageHash
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Store proof in database
    const [newProof] = await db
      .insert(proofs)
      .values({
        recipient,
        tokenAddress,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        minAmount,
        maxAmount,
        proof,
        publicInputs: JSON.stringify(publicInputs),
        globalTransfersRoot,
        addressCommitment,
        messageHash,
        message: message || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      proofId: newProof.id,
    })
  } catch (error) {
    console.error('Error storing proof:', error)
    return NextResponse.json(
      { error: 'Failed to store proof' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve proofs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const proofId = searchParams.get('id')

    if (proofId) {
      // Get specific proof by ID
      const proof = await db.query.proofs.findFirst({
        where: (proofs, { eq }) => eq(proofs.id, parseInt(proofId)),
      })

      if (!proof) {
        return NextResponse.json({ error: 'Proof not found' }, { status: 404 })
      }

      return NextResponse.json({ proof })
    } else {
      // Get all proofs
      const allProofs = await db.query.proofs.findMany({
        orderBy: (proofs, { desc }) => [desc(proofs.createdAt)],
      })

      return NextResponse.json({ proofs: allProofs })
    }
  } catch (error) {
    console.error('Error fetching proofs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proofs' },
      { status: 500 }
    )
  }
}
