import { EtherscanService } from '@/services/etherscan'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const address = searchParams.get('address')
  const startblock = searchParams.get('startblock')
  const endblock = searchParams.get('endblock')

  if (!address) {
    return NextResponse.json(
      { error: 'Address is required' },
      { status: 400 }
    )
  }

  try {
    const transfers = await EtherscanService.getERC20Transfers({
      address,
      startblock: startblock || undefined,
      endblock: endblock || undefined,
      sort: 'desc',
    })

    return NextResponse.json({ transfers })
  } catch (error) {
    console.error('Error fetching transfers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transfers' },
      { status: 500 }
    )
  }
}
