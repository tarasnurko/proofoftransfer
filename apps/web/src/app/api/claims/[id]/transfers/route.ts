import { NextResponse } from 'next/server'
import { getTransfersForClaim } from '@/db/queries/transfers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await getTransfersForClaim(id)

    // Format for EtherscanTransfer interface
    const formattedTransfers = result.map(({ transfers: t }) => ({
      hash: t.txHash,
      from: t.senderAddress,
      to: t.recipientAddress,
      contractAddress: t.tokenAddress,
      value: t.amount,
      timeStamp: t.blockTimestamp.toString(),
      blockNumber: t.blockNumber.toString()
    }))

    return NextResponse.json(formattedTransfers)
  } catch (error) {
    console.error('Error fetching transfers:', error)
    return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
  }
}
