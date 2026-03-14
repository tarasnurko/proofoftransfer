import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { ClaimDetails } from '@/components/features/claim-details/claim-details'
import { getClaimById } from '@/db/queries/claims'
import { EnsService } from '@/services/ens'
import { getChainName } from '@/utils/explorer.utils'
import { truncateText } from '@/utils/format.utils'
import { z } from 'zod'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return { title: 'Claim Not Found' }

  const claim = await getClaimById(id)

  if (!claim) return { title: 'Claim Not Found' }

  const chainName = getChainName(claim.chainId)
  const tokenSymbol = claim.token?.symbol ?? 'tokens'
  const description = `${claim.message} — ${tokenSymbol} on ${chainName}`

  return {
    title: `Claim: ${truncateText(claim.message, 50)}`,
    description,
    openGraph: { title: `Claim: ${claim.message}`, description },
  }
}

export default async function ClaimDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) notFound()

  const claim = await getClaimById(id)
  if (!claim) notFound()

  const ensName = await EnsService.getCachedEnsName(claim.counterpartyAddress)

  return (
    <PageContainer>
      <ClaimDetails claim={claim} ensName={ensName} />
    </PageContainer>
  )
}
