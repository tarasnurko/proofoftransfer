import { notFound } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { ClaimDetailsContent } from '@/components/features/claim-details/claim-details-content'
import { getClaimById } from '@/db/queries/claims'
import { getTransfersForClaim } from '@/db/queries/transfers'
import type { EtherscanTransfer } from '@/lib/types'

export default async function ClaimDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const claim = await getClaimById(id)
  if (!claim) notFound()

  const dbTransfers = await getTransfersForClaim(id)

  const transfers: EtherscanTransfer[] = dbTransfers.map((t) => ({
    hash: t.txHash,
    from: t.senderAddress,
    to: t.recipientAddress,
    contractAddress: t.tokenAddress,
    value: t.amount,
    timeStamp: t.blockTimestamp.toString(),
    blockNumber: t.blockNumber.toString(),
  }))

  return (
    <PageContainer>
      <ClaimDetailsContent claim={claim} transfers={transfers} />
    </PageContainer>
  )
}
