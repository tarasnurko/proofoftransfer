import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProofLoading() {
  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-9" />
      </div>

      <div className="mb-6">
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="space-y-6">
        {/* ClaimSummaryCard */}
        <Card className="border-4">
          <CardHeader>
            <Skeleton className="h-7 w-44" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-5 w-full" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-4 w-20" />
                  <Skeleton className="h-5 w-3/4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ProofInfoCard */}
        <Card className="border-4">
          <CardHeader>
            <Skeleton className="h-7 w-36" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* VerifyProofCard */}
        <Card className="border-4">
          <CardHeader>
            <Skeleton className="h-7 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
