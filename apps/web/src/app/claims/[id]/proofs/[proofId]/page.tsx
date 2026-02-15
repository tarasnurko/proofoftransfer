import { notFound } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { ProofDetails } from '@/components/features/proof-details/proof-details'
import { getClaimById } from '@/db/queries/claims'
import { getProofById } from '@/db/queries/proofs'
import { getVerificationStats } from '@/db/queries/verifications'
import type { ProofEntity } from '@/types'

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
