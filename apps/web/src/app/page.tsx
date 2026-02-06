'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { ClaimCard } from '@/components/features/claim-card'
import { LoadingState } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { Pagination } from '@/components/shared/pagination'
import type { ClaimEntity } from '@/lib/types'
import { SUPPORTED_CHAINS } from '@/lib/types'
import { FileSearch, Search } from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function HomePage() {
  const router = useRouter()
  const [claims, setClaims] = useState<ClaimEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [chainFilter, setChainFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('createdAt-desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchClaims()
  }, [])

  const fetchClaims = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/claims')
      if (!response.ok) throw new Error('Failed to fetch claims')
      const data = await response.json()
      setClaims(data.data || data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const filteredAndSortedClaims = useMemo(() => {
    let filtered = [...claims]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (claim) =>
          claim.message.toLowerCase().includes(query) ||
          claim.recipientAddress.toLowerCase().includes(query) ||
          claim.tokenAddress.toLowerCase().includes(query) ||
          claim.messageHash.toLowerCase().includes(query) ||
          claim.id.toLowerCase().includes(query)
      )
    }

    // Chain filter
    if (chainFilter !== 'all') {
      filtered = filtered.filter((claim) => claim.chainId === Number.parseInt(chainFilter))
    }

    // Sort
    const [sortField, sortOrder] = sortBy.split('-')
    filtered.sort((a, b) => {
      let aVal = 0
      let bVal = 0

      switch (sortField) {
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
        case 'proofCount':
          aVal = a.proofCount || 0
          bVal = b.proofCount || 0
          break
        default:
          return 0
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

    return filtered
  }, [claims, searchQuery, chainFilter, sortBy])

  const totalPages = Math.ceil(filteredAndSortedClaims.length / ITEMS_PER_PAGE)
  const paginatedClaims = filteredAndSortedClaims.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, chainFilter, sortBy])

  return (
    <PageContainer>
      <PageHeader
        title="Transfer Claims"
        description="Create verifiable on-chain transfer claims using zero-knowledge proofs"
      />

      {loading && <LoadingState message="Loading claims..." />}

      {error && <ErrorState message={error} />}

      {!loading && !error && claims.length === 0 && (
        <EmptyState
          icon={<FileSearch className="h-16 w-16" />}
          title="No Claims Yet"
          message="Be the first to create a verifiable transfer claim"
          action={{
            label: 'Create First Claim',
            onClick: () => router.push('/create'),
          }}
        />
      )}

      {!loading && !error && claims.length > 0 && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by message, address, hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-2 pl-9 font-bold"
              />
            </div>
            <Select value={chainFilter} onValueChange={setChainFilter}>
              <SelectTrigger className="border-2 font-bold">
                <SelectValue placeholder="All Chains" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chains</SelectItem>
                {SUPPORTED_CHAINS.map((chain) => (
                  <SelectItem key={chain.id} value={chain.id.toString()}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="border-2 font-bold">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="proofCount-desc">Most Proofs</SelectItem>
                <SelectItem value="proofCount-asc">Least Proofs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAndSortedClaims.length === 0 ? (
            <EmptyState
              icon={<FileSearch className="h-16 w-16" />}
              title="No Matches Found"
              message="Try adjusting your search or filters"
            />
          ) : (
            <>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <p>
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedClaims.length)} of{' '}
                  {filteredAndSortedClaims.length} claims
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {paginatedClaims.map((claim) => (
                  <ClaimCard key={claim.id} claim={claim} />
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      )}
    </PageContainer>
  )
}
