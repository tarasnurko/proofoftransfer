import { Skeleton } from '@/components/ui/skeleton'

export function ClaimsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-10 border-2 lg:col-span-2" />
        <Skeleton className="h-10 border-2" />
        <Skeleton className="h-10 border-2" />
      </div>
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-64 border-4" />
        ))}
      </div>
    </div>
  )
}
