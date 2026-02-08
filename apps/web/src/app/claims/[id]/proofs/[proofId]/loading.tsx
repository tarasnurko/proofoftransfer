import { PageContainer } from '@/components/layout/page-container'
import { LoadingState } from '@/components/shared/loading-state'

export default function ProofLoading() {
  return (
    <PageContainer>
      <LoadingState message="Loading proof details..." />
    </PageContainer>
  )
}
