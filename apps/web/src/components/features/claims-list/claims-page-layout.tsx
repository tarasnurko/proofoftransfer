'use client'

import { SearchTransitionProvider, useSearchTransition } from './search-transition-context'
import { ClaimsFilters } from './claims-filters'
import { ClaimsListSkeleton } from './claims-list-skeleton'

function ClaimsPageInner({ children }: { children: React.ReactNode }) {
  const { isPending } = useSearchTransition()

  return (
    <div className="space-y-6">
      <ClaimsFilters />
      {isPending ? <ClaimsListSkeleton /> : children}
    </div>
  )
}

export function ClaimsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <SearchTransitionProvider>
      <ClaimsPageInner>{children}</ClaimsPageInner>
    </SearchTransitionProvider>
  )
}
