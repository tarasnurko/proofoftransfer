'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Button, LoadingState, ErrorState } from '@/components/ui'
import { Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { getProofsByClaimIdAction, verifyProofAction, getVerificationStatsAction } from '@/actions'
import { toast } from 'sonner'
import { formatAddress } from '@/utils/format'
import type { SerializedProofWithMeta } from '@/types/proofs'

type Proof = SerializedProofWithMeta

type VerificationStats = {
  total: number
  successful: number
  failed: number
}

function ProofCard({ proof }: { proof: Proof }) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [stats, setStats] = useState<VerificationStats | null>(null)

  useEffect(() => {
    async function loadStats() {
      const result = await getVerificationStatsAction(proof.id)
      if (result.success && result.data) {
        setStats(result.data)
      }
    }
    if (proof.verificationCount > 0) {
      loadStats()
    }
  }, [proof.id, proof.verificationCount])

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const result = await verifyProofAction(proof.id)
      if (result.success) {
        if (result.isValid) {
          toast.success('Proof verified successfully!')
        } else {
          toast.error('Proof verification failed')
        }
        // Reload stats
        const statsResult = await getVerificationStatsAction(proof.id)
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data)
        }
      } else {
        toast.error(result.error || 'Verification failed')
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsVerifying(false)
    }
  }

  const verificationRate =
    stats && stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(0) : null

  return (
    <div className="border-2 border-foreground bg-background p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1 font-mono text-sm">
          <div className="text-muted-foreground">Proof ID</div>
          <div className="mt-1 break-all text-foreground">{formatAddress(proof.id)}</div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          {format(new Date(proof.created_at), 'MMM d, yyyy')}
        </div>
      </div>

      <div className="mb-3 font-mono text-sm">
        <div>
          <div className="text-muted-foreground">Nullifier</div>
          <div className="mt-1 break-all text-foreground">
            {proof.nullifier.slice(0, 10)}...
          </div>
        </div>
      </div>

      {stats && stats.total > 0 && (
        <div className="mb-3 rounded-none border-2 border-accent bg-accent/10 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stats.successful > 0 && stats.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : stats.failed > 0 ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : null}
              <span className="font-bold uppercase text-foreground">
                Verified {stats.total} time{stats.total !== 1 ? 's' : ''}
              </span>
            </div>
            {verificationRate && (
              <div className="text-sm font-bold text-accent">{verificationRate}% success</div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleVerify}
          disabled={isVerifying}
          className="border-2 border-foreground bg-foreground px-4 py-2 text-xs font-bold uppercase text-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          {isVerifying ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Proof'
          )}
        </Button>
        <Button
          onClick={() => setShowDetails(!showDetails)}
          variant="outline"
          className="border-2 border-foreground bg-background px-4 py-2 text-xs font-bold uppercase hover:bg-foreground hover:text-background"
        >
          <Eye className="mr-1 h-3 w-3" />
          {showDetails ? 'Hide' : 'Show'} Details
        </Button>
      </div>

      {showDetails && (
        <div className="mt-3 border-t-2 border-foreground pt-3 font-mono text-xs">
          <div className="mb-2">
            <div className="font-bold text-muted-foreground">Root Hash:</div>
            <div className="mt-1 break-all text-foreground">{proof.transfers_root_hash}</div>
          </div>
          <div>
            <div className="font-bold text-muted-foreground">Proof Data (truncated):</div>
            <div className="mt-1 max-h-24 overflow-auto break-all text-foreground">
              {proof.proof_data.slice(0, 200)}...
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ProofsList({ claimId }: { claimId: string }) {
  const [proofs, setProofs] = useState<Proof[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProofs() {
      try {
        setLoading(true)
        const result = await getProofsByClaimIdAction(claimId)

        if (result.success && result.data) {
          setProofs(result.data)
          setError(null)
        } else {
          const errorMessage = result.error || 'Failed to load proofs'
          setError(errorMessage)
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadProofs()
  }, [claimId])

  if (loading) {
    return <LoadingState message="Loading proofs..." />
  }

  if (error) {
    return <ErrorState error={error} />
  }

  return (
    <div className="border-4 border-foreground bg-background p-6">
      <div className="mb-6 flex items-center justify-between border-b-2 border-foreground pb-2">
        <h3 className="text-xl font-bold uppercase text-foreground">
          PROOFS ({proofs?.length ?? 0})
        </h3>
      </div>

      {!proofs || !proofs.length ? (
        <div className="py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No proofs submitted yet for this claim
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {proofs.map((proof) => (
            <ProofCard key={proof.id} proof={proof} />
          ))}
        </div>
      )}
    </div>
  )
}
