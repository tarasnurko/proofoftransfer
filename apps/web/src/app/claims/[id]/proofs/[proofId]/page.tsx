'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/loading-state'
import { ErrorState } from '@/components/error-state'
import { CopyHash } from '@/components/copy-hash'
import { CopyLinkButton } from '@/components/copy-link-button'
import { Address } from '@/components/address'
import type { ClaimEntity, ProofEntity } from '@/lib/types'
import { getChainName } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'

export default function ProofDetailsPage() {
  const params = useParams()
  const claimId = params.id as string
  const proofId = params.proofId as string

  const [claim, setClaim] = useState<ClaimEntity | null>(null)
  const [proof, setProof] = useState<ProofEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [claimId, proofId])

  const fetchData = async () => {
    try {
      setLoading(true)

      const [claimRes, proofRes] = await Promise.all([
        fetch(`/api/claims/${claimId}`),
        fetch(`/api/proofs/${proofId}`)
      ])

      if (!claimRes.ok || !proofRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [claimData, proofData] = await Promise.all([
        claimRes.json(),
        proofRes.json()
      ])

      setClaim(claimData)
      setProof(proofData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageContainer><LoadingState message="Loading proof details..." /></PageContainer>
  if (error) return <PageContainer><ErrorState message={error} /></PageContainer>
  if (!claim || !proof) return <PageContainer><ErrorState message="Proof not found" /></PageContainer>

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/claims/${claimId}`} className="inline-flex items-center text-sm hover:opacity-80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Claim
        </Link>
        <CopyLinkButton />
      </div>

      <div className="mb-8 space-y-2 border-b-4 border-border pb-6">
        <h1 className="text-balance text-4xl font-bold uppercase tracking-tight">Proof Details</h1>
      </div>

      <div className="space-y-6">
        {/* Claim Information */}
        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Claim Information</CardTitle>
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
                <div className="mt-1">
                  {claim.token ? `${claim.token.name} (${claim.token.symbol})` : 'Unknown'}
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
          </CardContent>
        </Card>

        {/* Proof Details */}
        <Card className="border-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Proof Information</CardTitle>
              {proof.verified !== undefined && (
                <Badge variant={proof.verified ? 'default' : 'destructive'} className="text-lg">
                  {proof.verified ? 'Valid' : 'Invalid'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-bold text-muted-foreground">Nullifier</div>
              <div className="mt-1">
                <CopyHash hash={proof.nullifier} />
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-muted-foreground">Proof Data</div>
              <details className="mt-1">
                <summary className="cursor-pointer text-sm text-accent hover:underline">
                  Show proof data
                </summary>
                <pre className="mt-2 overflow-x-auto rounded border-2 border-border bg-muted p-4 text-xs">
                  {proof.proofData}
                </pre>
              </details>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm font-bold text-muted-foreground">Transfers Root Hash</div>
                <div className="mt-1">
                  <CopyHash hash={proof.transfersRootHash} />
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Submitted</div>
                <div className="mt-1">{new Date(proof.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {proof.proverAddress && (
              <div>
                <div className="text-sm font-bold text-muted-foreground">Prover Address</div>
                <div className="mt-1">
                  <Address address={proof.proverAddress} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
