import { PageContainer } from '@/components/layout/page-container'
import { LoadingState } from '@/components/shared/loading-state'

export default function ClaimLoading() {
  return (
    <PageContainer>
      <LoadingState message="Loading claim details..." />
    </PageContainer>
  )
}
