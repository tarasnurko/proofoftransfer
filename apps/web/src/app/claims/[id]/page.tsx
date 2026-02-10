import { notFound } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { ClaimDetailsContent } from '@/components/features/claim-details/claim-details-content'
import { getClaimById } from '@/db/queries/claims'

export default async function ClaimDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const claim = await getClaimById(id)
  if (!claim) notFound()

  return (
    <PageContainer>
      <ClaimDetailsContent claim={claim} />
    </PageContainer>
  )
}
