import { PageContainer } from '@/components/layout/page-container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ClaimLoading() {
  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-9" />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-6 w-20 border-2" />
      </div>

      <div className="space-y-6">
        {/* ClaimInfoCard */}
        <Card className="border-4">
          <CardHeader>
            <Skeleton className="h-7 w-36" />
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

        {/* TransfersCard */}
        <Card className="border-4">
          <CardHeader>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-2 border-border p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-10" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="mt-1 h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* GenerateProofCard */}
        <Card className="border-4">
          <CardHeader>
            <Skeleton className="h-7 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-10 w-48" />
          </CardContent>
        </Card>

        {/* ProofsCard */}
        <Card className="border-4">
          <CardHeader>
            <Skeleton className="h-7 w-20" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
