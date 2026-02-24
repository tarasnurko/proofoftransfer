'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { ClaimCard } from '@/components/features/claim-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { FileSearch } from 'lucide-react'
import type { ClaimEntity } from '@/types'
import type { Nullable } from '@/types/common.types'
interface ClaimsListProps {
  claims: ClaimEntity[]
  ensNames: Record<string, Nullable<string>>
  total: number
  totalPages: number
  currentPage: number
  pageSize: number
}

export function ClaimsList({ claims, ensNames, total, totalPages, currentPage, pageSize }: ClaimsListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page > 1) params.set('page', page.toString())
    else params.delete('page')
    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/')
  }

  if (!claims.length) {
    return (
      <EmptyState
        icon={<FileSearch className="h-16 w-16" />}
        title="No Matches Found"
        message="Try adjusting your search or filters"
      />
    )
  }

  return (
    <>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {(currentPage - 1) * pageSize + 1} to{' '}
          {Math.min(currentPage * pageSize, total)} of {total} claims
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {claims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} ensName={ensNames[claim.counterpartyAddress]} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </>
  )
}
