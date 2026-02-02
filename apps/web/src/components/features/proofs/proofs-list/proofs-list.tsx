'use client'

import { format } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAction } from 'next-safe-action/hooks'
import { Button, LoadingState, ErrorState } from '@/components/ui'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { verifyProofAction } from '@/actions'
import { QUERY_KEYS, fetchProofsByClaimId, fetchVerificationStats } from '@/lib/queries'
import { toast } from 'sonner'
import { formatAddress } from '@/utils/format'

type VerificationStats = {
  total: number
  successful: number
  failed: number
}

function ProofCard({ proof }: { proof: { id: string; nullifier: string; createdAt: Date; transfersRootHash: string; proofData: string; verificationCount: number } }) {
  const queryClient = useQueryClient()

  const { data: stats } = useQuery({
    queryKey: QUERY_KEYS.proofs.verificationStats(proof.id),
    queryFn: () => fetchVerificationStats(proof.id),
    enabled: proof.verificationCount > 0,
  })

  const { execute: verify, isPending: isVerifying } = useAction(verifyProofAction, {
    onSuccess: ({ data }) => {
      if (data?.isValid) {
        toast.success('Proof verified successfully!')
      } else {
        toast.error('Proof verification failed')
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.proofs.verificationStats(proof.id) })
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Verification failed')
    },
  })

  const typedStats = stats as VerificationStats | undefined
  const verificationRate =
    typedStats && typedStats.total > 0 ? ((typedStats.successful / typedStats.total) * 100).toFixed(0) : null

  return (
    <div className="border-2 border-foreground bg-background p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex-1 font-mono text-sm">
          <div className="text-muted-foreground">Proof ID</div>
          <div className="mt-1 break-all text-foreground">{formatAddress(proof.id)}</div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          {format(new Date(proof.createdAt), 'MMM d, yyyy')}
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

      {typedStats && typedStats.total > 0 && (
        <div className="mb-3 rounded-none border-2 border-accent bg-accent/10 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {typedStats.successful > 0 && typedStats.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : typedStats.failed > 0 ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : null}
              <span className="font-bold uppercase text-foreground">
                Verified {typedStats.total} time{typedStats.total !== 1 ? 's' : ''}
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
          onClick={() => verify({ id: proof.id })}
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
      </div>
    </div>
  )
}

export function ProofsList({ claimId }: { claimId: string }) {
  const { data: proofs, isPending, error } = useQuery({
    queryKey: QUERY_KEYS.proofs.byClaimId(claimId),
    queryFn: () => fetchProofsByClaimId(claimId),
  })

  if (isPending) {
    return <LoadingState message="Loading proofs..." />
  }

  if (error) {
    return <ErrorState error={error.message} />
  }

  return (
    <div className="border-4 border-foreground bg-background p-6">
      <div className="mb-6 flex items-center justify-between border-b-2 border-foreground pb-2">
        <h3 className="text-xl font-bold uppercase text-foreground">
          PROOFS ({proofs?.length ?? 0})
        </h3>
      </div>

      {!proofs?.length ? (
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
