'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { PageContainer } from '@/components/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/loading-state'
import { ErrorState } from '@/components/error-state'
import { EmptyState } from '@/components/empty-state'
import { Address } from '@/components/address'
import { CopyHash } from '@/components/copy-hash'
import { CopyLinkButton } from '@/components/copy-link-button'
import type { ClaimEntity, EtherscanTransfer, ProofEntity } from '@/lib/types'
import { getChainName } from '@/lib/types'
import { formatTokenAmount } from '@/lib/address-utils'
import { ArrowLeft, Loader2, Search, ChevronLeft, ChevronRight, FileSearch } from 'lucide-react'
import { toast } from 'sonner'

const PROOFS_PER_PAGE = 9

export default function ClaimDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const claimId = params.id as string
  const { address: walletAddress, isConnected } = useAccount()

  const [claim, setClaim] = useState<ClaimEntity | null>(null)
  const [proofs, setProofs] = useState<ProofEntity[]>([])
  const [transfers, setTransfers] = useState<EtherscanTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnlyMyTransfers, setShowOnlyMyTransfers] = useState(false)

  // Proof search and pagination
  const [proofSearchQuery, setProofSearchQuery] = useState('')
  const [proofSortBy, setProofSortBy] = useState('createdAt-desc')
  const [proofPage, setProofPage] = useState(1)

  useEffect(() => {
    fetchClaimDetails()
    fetchProofs()
    fetchTransfers()
  }, [claimId])

  const fetchClaimDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/claims/${claimId}`)
      if (!response.ok) throw new Error('Claim not found')
      const data = await response.json()
      setClaim(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchProofs = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/proofs`)
      if (response.ok) {
        const data = await response.json()
        setProofs(data)
      }
    } catch (err) {
      console.error('Failed to fetch proofs:', err)
    }
  }

  const fetchTransfers = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/transfers`)
      if (response.ok) {
        const data = await response.json()
        setTransfers(data)
      }
    } catch (error) {
      console.error('Failed to fetch transfers:', error)
    }
  }

  const displayedTransfers = useMemo(() => {
    if (!showOnlyMyTransfers || !walletAddress) return transfers
    return transfers.filter(t => t.from.toLowerCase() === walletAddress.toLowerCase())
  }, [transfers, showOnlyMyTransfers, walletAddress])

  const userTransferCount = useMemo(() => {
    if (!walletAddress) return 0
    return transfers.filter(t => t.from.toLowerCase() === walletAddress.toLowerCase()).length
  }, [transfers, walletAddress])

  const filteredAndSortedProofs = useMemo(() => {
    let filtered = [...proofs]

    if (proofSearchQuery) {
      const query = proofSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (proof) =>
          proof.nullifier.toLowerCase().includes(query) ||
          proof.id.toLowerCase().includes(query)
      )
    }

    const [sortField, sortOrder] = proofSortBy.split('-')
    filtered.sort((a, b) => {
      const aVal = new Date(a.createdAt).getTime()
      const bVal = new Date(b.createdAt).getTime()
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

    return filtered
  }, [proofs, proofSearchQuery, proofSortBy])

  const totalProofPages = Math.ceil(filteredAndSortedProofs.length / PROOFS_PER_PAGE)
  const paginatedProofs = filteredAndSortedProofs.slice(
    (proofPage - 1) * PROOFS_PER_PAGE,
    proofPage * PROOFS_PER_PAGE
  )

  useEffect(() => {
    setProofPage(1)
  }, [proofSearchQuery, proofSortBy])

  if (loading) return <PageContainer><LoadingState message="Loading claim details..." /></PageContainer>
  if (error) return <PageContainer><ErrorState message={error} /></PageContainer>
  if (!claim) return <PageContainer><ErrorState message="Claim not found" /></PageContainer>

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-sm hover:opacity-80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Claims
        </Link>
        <CopyLinkButton />
      </div>

      <div className="mb-8 space-y-2 border-b-4 border-border pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-balance text-4xl font-bold uppercase tracking-tight">Claim Details</h1>
          {claim.proofCount > 0 && (
            <Badge className="shrink-0 whitespace-nowrap border-2 text-sm font-bold">
              {claim.proofCount} Proof{claim.proofCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Claim Details Card */}
        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-bold text-muted-foreground">Message</div>
              <p className="mt-1">{claim.message}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm font-bold text-muted-foreground">Chain</div>
                <div className="mt-1">{getChainName(claim.chainId)}</div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Token</div>
                <div className="mt-1 flex items-center gap-2">
                  {claim.token ? `${claim.token.name} (${claim.token.symbol})` : 'Unknown'}
                  <CopyHash hash={claim.tokenAddress} />
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Recipient</div>
                <div className="mt-1">
                  <Address address={claim.recipientAddress} />
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Created</div>
                <div className="mt-1">{new Date(claim.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {claim.merkleRoot && (
              <div>
                <div className="text-sm font-bold text-muted-foreground">Merkle Root</div>
                <div className="mt-1 flex items-center gap-2">
                  <CopyHash hash={claim.merkleRoot} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfers Section */}
        <Card className="border-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Transfers</CardTitle>
                <CardDescription>
                  {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} matching this claim
                </CardDescription>
              </div>
              {isConnected && userTransferCount > 0 && (
                <Button
                  variant={showOnlyMyTransfers ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowOnlyMyTransfers(!showOnlyMyTransfers)}
                  className="border-2 font-bold"
                >
                  {showOnlyMyTransfers ? 'Show All' : `My Transfers (${userTransferCount})`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {displayedTransfers.length === 0 ? (
              <EmptyState
                icon={<FileSearch className="h-12 w-12" />}
                title="No Transfers"
                message={showOnlyMyTransfers ? "You don't have any transfers" : "No transfers found"}
              />
            ) : (
              <div className="space-y-2">
                {displayedTransfers.map((transfer, i) => (
                  <div key={i} className="flex items-center justify-between border-2 border-border p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Address address={transfer.from} />
                        {walletAddress && transfer.from.toLowerCase() === walletAddress.toLowerCase() && (
                          <Badge className="bg-accent text-accent-foreground">You</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {new Date(parseInt(transfer.timeStamp) * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      {transfer.value && claim.token
                        ? formatTokenAmount(transfer.value, claim.token.decimals, claim.token.symbol)
                        : transfer.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Proofs Section */}
        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Submitted Proofs</CardTitle>
            <CardDescription>
              {filteredAndSortedProofs.length} proof{filteredAndSortedProofs.length !== 1 ? 's' : ''} submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            {proofs.length > 0 && (
              <div className="mb-4 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by nullifier or ID..."
                    value={proofSearchQuery}
                    onChange={(e) => setProofSearchQuery(e.target.value)}
                    className="border-2 pl-9"
                  />
                </div>
                <Select value={proofSortBy} onValueChange={setProofSortBy}>
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

            {filteredAndSortedProofs.length === 0 ? (
              <EmptyState
                icon={<FileSearch className="h-12 w-12" />}
                title="No Proofs"
                message={proofSearchQuery ? "No proofs match your search" : "No proofs submitted yet"}
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedProofs.map((proof) => (
                    <Link
                      key={proof.id}
                      href={`/claims/${claimId}/proofs/${proof.id}`}
                      className="block border-4 border-border p-4 transition-colors hover:bg-muted"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="text-sm font-bold text-muted-foreground">Proof</div>
                        {proof.verified !== undefined && (
                          <Badge variant={proof.verified ? 'default' : 'destructive'}>
                            {proof.verified ? 'Valid' : 'Invalid'}
                          </Badge>
                        )}
                      </div>
                      <div className="mb-2 font-mono text-xs">{proof.nullifier.slice(0, 20)}...</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(proof.createdAt).toLocaleDateString()}
                      </div>
                    </Link>
                  ))}
                </div>

                {totalProofPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProofPage((p) => Math.max(1, p - 1))}
                      disabled={proofPage === 1}
                      className="border-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalProofPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={proofPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setProofPage(page)}
                          className="border-2"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProofPage((p) => Math.min(totalProofPages, p + 1))}
                      disabled={proofPage === totalProofPages}
                      className="border-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
