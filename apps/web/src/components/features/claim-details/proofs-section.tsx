'use client'

import { useState } from 'react'
import { ProofsListCard } from './proofs-list-card'
import { PROOFS_SORT_OPTIONS } from '@/constants'
import { parseProofsSort } from '@/utils/claims.utils'
import { useGetProofsByClaimId } from '@/hooks/queries'
import type { SortOrder } from '@/types'
import type { PreparedProofData } from '@/lib/proof'

const PROOFS_PER_PAGE = 9

interface ProofsSectionProps {
  claimId: string
  preparedProof: PreparedProofData | null
}

export function ProofsSection({ claimId, preparedProof }: ProofsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useGetProofsByClaimId({
    claimId,
    search: searchQuery,
    sortOrder,
    page,
    limit: PROOFS_PER_PAGE,
  })

  const proofs = data?.proofs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PROOFS_PER_PAGE)

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleSortChange = (sort: string) => {
    setSortOrder(parseProofsSort(sort))
    setPage(1)
  }

  return (
    <ProofsListCard
      claimId={claimId}
      totalCount={total}
      isLoading={isLoading}
      isRefetching={isFetching && !isLoading}
      proofs={proofs}
      preparedProof={preparedProof}
      searchQuery={searchQuery}
      sortBy={sortOrder === 'asc' ? PROOFS_SORT_OPTIONS.OLDEST : PROOFS_SORT_OPTIONS.NEWEST}
      currentPage={page}
      totalPages={totalPages}
      onSearchChange={handleSearchChange}
      onSortChange={handleSortChange}
      onPageChange={setPage}
    />
  )
}
