import { EtherscanService } from '@/services/etherscan'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const timestamp = searchParams.get('timestamp')
  const closest = searchParams.get('closest') as 'before' | 'after' | null

  if (!timestamp) {
    return NextResponse.json(
      { error: 'Timestamp is required' },
      { status: 400 }
    )
  }

  try {
    const blockNumber = await EtherscanService.getClosestBlockNumberByDate({
      timestamp,
      closest: closest || 'before',
    })

    return NextResponse.json({ blockNumber })
  } catch (error) {
    console.error('Error fetching block number:', error)
    return NextResponse.json(
      { error: 'Failed to fetch block number' },
      { status: 500 }
    )
  }
}
