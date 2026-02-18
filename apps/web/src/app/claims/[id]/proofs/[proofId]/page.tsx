import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { ProofDetails } from '@/components/features/proof-details/proof-details'
import { getClaimById } from '@/db/queries/claims'
import { getProofById } from '@/db/queries/proofs'
import { getVerificationStats } from '@/db/queries/verifications'
import { getChainName } from '@/utils/explorer.utils'
import type { ProofEntity } from '@/types'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; proofId: string }>
}): Promise<Metadata> {
  const { id: claimId, proofId } = await params
  const [claim, proofResult] = await Promise.all([
    getClaimById(claimId),
    getProofById(proofId),
  ])

  if (!claim || !proofResult) return { title: 'Proof Not Found' }

  const chainName = getChainName(claim.chainId)
  const description = `ZK proof for "${claim.message}" on ${chainName}`

  return {
    title: `Proof #${proofId.slice(0, 8)}`,
    description,
    openGraph: { title: `Proof #${proofId.slice(0, 8)}`, description },
  }
}

export default async function ProofDetailsPage({
  params,
}: {
  params: Promise<{ id: string; proofId: string }>
}) {
  const { id: claimId, proofId } = await params

  const [claim, proofResult] = await Promise.all([
    getClaimById(claimId),
    getProofById(proofId),
  ])

  if (!claim || !proofResult) notFound()

  const stats = await getVerificationStats(proofId)

  const { claim: _claimData, ...proofData } = proofResult

  const proof: ProofEntity = {
    ...proofData,
    publicInputs: proofData.publicInputs as object,
    verificationStats: {
      successful: stats.successful,
      failed: stats.failed,
    },
  }

  return (
    <PageContainer>
      <ProofDetails claim={claim} proof={proof} />
    </PageContainer>
  )
}
