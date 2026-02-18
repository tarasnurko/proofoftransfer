import type { Metadata } from 'next'
import { PageContainer } from '@/components/layout/page-container'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { CreateClaimForm } from '@/components/features/create-claim'

export const metadata: Metadata = {
  title: 'Create Claim',
  description: 'Set up a verifiable transfer claim using zero-knowledge proofs',
}

export default function CreateClaimPage() {
  return (
    <PageContainer>
      <div className="mb-4">
        <BackLink href="/" label="Back to Claims" />
      </div>

      <PageHeader
        title="Create Claim"
        description="Set up a verifiable transfer claim that others can prove using zero-knowledge proofs"
      />

      <CreateClaimForm />
    </PageContainer>
  )
}
