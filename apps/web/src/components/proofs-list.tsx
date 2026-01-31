'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { getProofsByClaimIdAction, verifyProofAction, getVerificationStatsAction } from '@/actions/proofs'
import { toast } from 'sonner'

type Proof = {
  id: string
  claim_id: string
  nullifier: string
  proof_data: string
  public_inputs: any
  transfers_root_hash: string
  created_at: string
  verificationCount: number
}

type VerificationStats = {
  total: number
  successful: number
  failed: number
}

function formatAddress(address: string | null): string {
  if (!address) return 'Anonymous'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
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
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
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
        } else {
          setError(result.error || 'Failed to load proofs')
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadProofs()
  }, [claimId])

  if (loading) {
    return (
      <div className="border-4 border-foreground bg-background p-12 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
        <p className="mt-4 font-bold uppercase text-muted-foreground">Loading proofs...</p>
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

  return (
    <div className="border-4 border-foreground bg-background p-6">
      <div className="mb-6 flex items-center justify-between border-b-2 border-foreground pb-2">
        <h3 className="text-xl font-bold uppercase text-foreground">
          PROOFS ({proofs.length})
        </h3>
      </div>

      {proofs.length === 0 ? (
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
