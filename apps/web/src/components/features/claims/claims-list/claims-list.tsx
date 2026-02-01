'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button, LoadingState, ErrorState, EmptyState } from '@/components/ui'
import { ArrowRight } from 'lucide-react'
import { getClaimsAction } from '@/actions'
import { formatAddress, formatTimestamp } from '@/utils/format'
import { getChainName } from '@/utils/blockchain.utils'
import { toast } from 'sonner'
import type { SerializedClaimWithMeta } from '@/types/claims'

type Claim = SerializedClaimWithMeta

export function ClaimsList() {
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadClaims() {
      try {
        setLoading(true)
        const result = await getClaimsAction()

        if (result.success && result.data) {
          setClaims(result.data)
          setError(null)
        } else {
          const errorMessage = result.error || 'Failed to load claims'
          setError(errorMessage)
          toast.error(errorMessage)
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadClaims()
  }, [])

  if (loading) {
    return <LoadingState message="Loading claims..." />
  }

  if (error) {
    return <ErrorState error={error} />
  }

  if (!claims || !claims.length) {
    return (
      <EmptyState
        title="NO CLAIMS YET"
        message="Be the first to create a transfer claim"
        action={
          <Link href="/create">
            <Button className="border-2 border-foreground bg-accent px-8 py-4 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background">
              Create Claim <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        }
      />
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {claims.map((claim) => (
        <div
          key={claim.id}
          className="border-4 border-foreground bg-background p-6 transition-all hover:border-accent"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-4 font-mono text-sm text-muted-foreground">
                <span>ID: {formatAddress(claim.id)}</span>
                <span>•</span>
                <span>{format(new Date(claim.created_at), 'MMM d, yyyy')}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground">{claim.message}</h3>
            </div>
            <div className="rounded-none border-2 border-accent bg-accent/10 px-4 py-2 text-center">
              <div className="text-2xl font-bold text-accent">{claim.proofCount}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Proofs
              </div>
            </div>
          </div>

          <div className="mb-4 grid gap-4 font-mono text-sm md:grid-cols-3">
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">Chain</div>
              <div className="mt-1 text-foreground">{getChainName(claim.chain_id)}</div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">Token</div>
              <div className="mt-1 text-foreground">
                {claim.token ? (
                  <>
                    {claim.token.name} ({claim.token.symbol})
                  </>
                ) : (
                  formatAddress(claim.token_address)
                )}
              </div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                Recipient
              </div>
              <div className="mt-1 text-foreground">{formatAddress(claim.recipient_address)}</div>
            </div>
          </div>

          <div className="mb-4 grid gap-4 font-mono text-sm md:grid-cols-2">
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                Amount Range
              </div>
              <div className="mt-1 text-foreground">
                {claim.min_transfers_sum === '0' ? 'No min' : claim.min_transfers_sum} -{' '}
                {claim.max_transfers_sum === '0' ? 'No max' : claim.max_transfers_sum}
              </div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                Time Range
              </div>
              <div className="mt-1 text-foreground">
                {formatTimestamp(claim.from_block_timestamp)} →{' '}
                {formatTimestamp(claim.to_block_timestamp)}
              </div>
            </div>
          </div>

          <div>
            <Link href={`/claims/${claim.id}`} className="block">
              <Button className="w-full border-2 border-foreground bg-accent px-6 py-4 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background">
                View Details <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
