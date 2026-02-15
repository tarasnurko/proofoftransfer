import { notFound } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { ClaimDetails } from '@/components/features/claim-details/claim-details'
import { getClaimById } from '@/db/queries/claims'
import { EnsService } from '@/services/ens'

export default async function ClaimDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const claim = await getClaimById(id)
  if (!claim) notFound()

  const ensName = await EnsService.getCachedEnsName(claim.recipientAddress)

  return (
    <PageContainer>
      <ClaimDetails claim={claim} ensName={ensName} />
    </PageContainer>
  )
}
