import { NextRequest, NextResponse } from 'next/server'
import { generateProof, proofToHex } from '@/utils/generateProof'
import { db } from '@/db'
import { proofs } from '@/db/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      senderAddress,
      salt,
      publicKeyX,
      publicKeyY,
      signature,
      messageHash,
      message,
      allTransfers,
      proverTransfers,
      tokenAddress,
      receiverAddress,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = body

    // Validate required fields
    if (
      !senderAddress ||
      !salt ||
      !signature ||
      !messageHash ||
      !allTransfers ||
      !proverTransfers ||
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
    const showLog = (log: string) => {
      logs.push(log)
      console.log(log)
    }

    // Generate proof
    const { proof, publicInputs } = await generateProof(
      {
        senderAddress,
        salt,
        publicKeyX,
        publicKeyY,
        signature,
        messageHash,
        allTransfers,
        proverTransfers,
        tokenAddress,
        receiverAddress,
        startDate,
        endDate,
        minAmount: minAmount || '0',
        maxAmount: maxAmount || '999999999999999999',
      },
      showLog
    )

    const proofHex = proofToHex(proof)

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
        proof: proofHex,
        publicInputs: JSON.stringify(publicInputs),
        globalTransfersRoot: publicInputs[0],
        addressCommitment: publicInputs[1],
        messageHash,
        message: message || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      proofId: newProof.id,
      logs,
    })
  } catch (error: any) {
    console.error('Error generating proof:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate proof' },
      { status: 500 }
    )
  }
}
