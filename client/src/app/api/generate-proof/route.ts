import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PROOF_SERVER_URL = process.env.PROOF_SERVER_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Forward request to proof generation server
    const response = await fetch(`${PROOF_SERVER_URL}/generate-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Proof generation failed' },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error communicating with proof server:', error)

    // Check if proof server is running
    if (error.cause?.code === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          error: 'Proof generation server is not running. Please start it with: yarn proof-server',
          details: 'The proof server must be running on port 3001 to generate proofs.'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to generate proof' },
      { status: 500 }
    )
  }
}
