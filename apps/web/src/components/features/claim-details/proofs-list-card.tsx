'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { formatDate } from '@/utils/format.utils'
import type { ProofEntity } from '@/types'
import type { PreparedProofData } from '@/lib/proof'
import { PROOFS_SORT_LABELS, type ProofsSortValue } from '@/constants'
import { VerificationStats } from '@/components/shared/verification-stats'
import { FileSearch, Search } from 'lucide-react'

interface ProofsListCardProps {
  claimId: string
  totalCount: number
  isLoading: boolean
  isRefetching: boolean
  proofs: ProofEntity[]
  preparedProof: PreparedProofData | null
  searchQuery: string
  sortBy: string
  currentPage: number
  totalPages: number
  onSearchChange: (query: string) => void
  onSortChange: (sort: string) => void
  onPageChange: (page: number) => void
}

export function ProofsListCard({
  claimId,
  totalCount,
  isLoading,
  isRefetching,
  proofs,
  preparedProof,
  searchQuery,
  sortBy,
  currentPage,
  totalPages,
  onSearchChange,
  onSortChange,
  onPageChange,
}: ProofsListCardProps) {
  return (
    <Card className="border-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Submitted Proofs</CardTitle>
        <CardDescription>
          {totalCount} proof{totalCount !== 1 ? 's' : ''} submitted
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(totalCount > 0 || searchQuery) && (
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by nullifier or ID..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="border-2 pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-48 border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PROOFS_SORT_LABELS) as [ProofsSortValue, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-4 border-border p-4">
                <div className="mb-2 flex items-start justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <Skeleton className="mb-2 h-4 w-40" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : !proofs.length ? (
          <EmptyState
            icon={<FileSearch className="h-12 w-12" />}
            title="No Proofs"
            message={searchQuery ? "No proofs match your search" : "No proofs submitted yet"}
          />
        ) : (
          <>
            <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity ${isRefetching ? 'opacity-50' : ''}`}>
              {proofs.map((proof) => (
                <Link
                  key={proof.id}
                  href={`/claims/${claimId}/proofs/${proof.id}`}
                  className={`block border-4 p-4 transition-colors hover:bg-muted ${preparedProof && proof.nullifier === preparedProof.nullifier ? 'border-accent bg-accent/5' : 'border-border'}`}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground">Proof</span>
                      {preparedProof && proof.nullifier === preparedProof.nullifier && (
                        <Badge variant="outline" className="border-accent text-accent text-xs">Yours</Badge>
                      )}
                    </div>
                    {proof.verified !== undefined && (
                      <Badge variant={proof.verified ? 'default' : 'destructive'}>
                        {proof.verified ? 'Valid' : 'Invalid'}
                      </Badge>
                    )}
                  </div>
                  <div className="mb-2 font-mono text-xs">{proof.nullifier.slice(0, 20)}...</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(proof.createdAt)}
                    </div>
                    {proof.verificationStats ? (
                      <VerificationStats stats={proof.verificationStats} size="sm" />
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
