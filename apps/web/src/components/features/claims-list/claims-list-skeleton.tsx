import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

function ClaimCardSkeleton() {
  return (
    <Card className="flex flex-col border-4">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-full" />
          </div>
          <Skeleton className="h-6 w-20 border-2" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        <div className="space-y-2 rounded border-2 border-border p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  )
}

export function ClaimsListSkeleton() {
  return (
    <>
      <Skeleton className="h-5 w-48" />
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <ClaimCardSkeleton key={i} />
        ))}
      </div>
    </>
  )
}
