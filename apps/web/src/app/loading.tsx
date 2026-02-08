import { PageContainer } from '@/components/layout/page-container'
import { LoadingState } from '@/components/shared/loading-state'

export default function Loading() {
  return (
    <PageContainer>
      <LoadingState message="Loading..." />
    </PageContainer>
  )
}
