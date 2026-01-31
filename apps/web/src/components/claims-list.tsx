'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { ArrowRight, Loader2 } from 'lucide-react'
import { getClaimsAction } from '@/actions/claims'
import { toast } from 'sonner'

type Claim = {
  id: string
  message: string
  message_hash: string
  token_address: string
  recipient_address: string
  min_transfers_sum: string
  max_transfers_sum: string
  from_block_timestamp: number
  to_block_timestamp: number
  chain_id: number
  creator_address: string
  created_at: string
  proofCount: number
}

function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return 'No limit'
  return format(new Date(timestamp * 1000), 'MMM d, yyyy')
}

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
        } else {
          setError(result.error || 'Failed to load claims')
          toast.error('Failed to load claims')
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred')
        toast.error('Failed to load claims')
      } finally {
        setLoading(false)
      }
    }

    loadClaims()
  }, [])

  if (loading) {
    return (
      <div className="border-4 border-foreground bg-background p-12 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
        <p className="mt-4 font-bold uppercase text-muted-foreground">Loading claims...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border-4 border-red-500 bg-red-500/10 p-12 text-center">
        <h3 className="mb-2 text-xl font-bold uppercase text-foreground">ERROR</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <div className="border-4 border-foreground bg-background p-12 text-center">
        <h3 className="mb-2 text-xl font-bold uppercase text-foreground">NO CLAIMS YET</h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Be the first to create a transfer claim
        </p>
        <Link href="/create">
          <Button className="border-2 border-foreground bg-accent px-8 py-4 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background">
            Create Claim <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

          <div className="mb-4 grid gap-4 font-mono text-sm md:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">Token</div>
              <div className="mt-1 text-foreground">{formatAddress(claim.token_address)}</div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                Recipient
              </div>
              <div className="mt-1 text-foreground">{formatAddress(claim.recipient_address)}</div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">Creator</div>
              <div className="mt-1 text-foreground">{formatAddress(claim.creator_address)}</div>
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

          <div className="flex gap-3">
            <Link href={`/proof?claim=${claim.id}`} className="flex-1">
              <Button className="w-full border-2 border-foreground bg-foreground px-6 py-4 font-bold uppercase text-background hover:bg-accent hover:text-accent-foreground">
                Generate Proof <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/claims/${claim.id}`}>
              <Button
                variant="outline"
                className="border-2 border-foreground bg-background px-6 py-4 font-bold uppercase hover:bg-foreground hover:text-background"
              >
                View Details
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
