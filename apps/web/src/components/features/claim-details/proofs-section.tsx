'use client'

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { ProofsCard } from './proofs-card'
import type { ProofEntity } from '@/lib/types'
import type { PreparedProofData } from '@/lib/proof-generator'

const PROOFS_PER_PAGE = 9

interface ProofsApiResponse {
  proofs: ProofEntity[]
  total: number
}

interface ProofsSectionProps {
  claimId: string
  preparedProof: PreparedProofData | null
}

export function ProofsSection({ claimId, preparedProof }: ProofsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching } = useQuery<ProofsApiResponse>({
    queryKey: ['proofs', claimId, { search: searchQuery, sortOrder, page }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PROOFS_PER_PAGE),
        sortOrder,
      })
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/claims/${claimId}/proofs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch proofs')
      return res.json()
    },
    placeholderData: keepPreviousData,
  })

  const proofs = data?.proofs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PROOFS_PER_PAGE)

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleSortChange = (sort: string) => {
    const order = sort === 'createdAt-asc' ? 'asc' as const : 'desc' as const
    setSortOrder(order)
    setPage(1)
  }

  return (
    <ProofsCard
      claimId={claimId}
      totalCount={total}
      isLoading={isLoading}
      isRefetching={isFetching && !isLoading}
      proofs={proofs}
      preparedProof={preparedProof}
      searchQuery={searchQuery}
      sortBy={`createdAt-${sortOrder}`}
      currentPage={page}
      totalPages={totalPages}
      onSearchChange={handleSearchChange}
      onSortChange={handleSortChange}
      onPageChange={setPage}
    />
  )
}
