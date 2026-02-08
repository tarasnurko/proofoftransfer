'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { Pagination } from '@/components/shared/pagination'
import { format } from 'date-fns'
import type { ProofEntity } from '@/lib/types'
import type { PreparedProofData } from '@/lib/proof-generator'
import { FileSearch, Search, CheckCircle2, XCircle } from 'lucide-react'

interface ProofsCardProps {
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

export function ProofsCard({
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
}: ProofsCardProps) {
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
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
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
                      {format(new Date(proof.createdAt), 'dd.MM.yyyy')}
                    </div>
                    {proof.verificationStats ? (
                      <div className="flex items-center gap-2 text-xs font-bold">
                        {proof.verificationStats.successful > 0 && (
                          <span className="flex items-center gap-0.5 text-accent">
                            <CheckCircle2 className="h-3 w-3" />
                            {proof.verificationStats.successful}
                          </span>
                        )}
                        {proof.verificationStats.failed > 0 && (
                          <span className="flex items-center gap-0.5 text-destructive">
                            <XCircle className="h-3 w-3" />
                            {proof.verificationStats.failed}
                          </span>
                        )}
                      </div>
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
