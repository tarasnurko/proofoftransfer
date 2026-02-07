'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CopyHash } from '@/components/shared/copy-hash'
import { Address } from '@/components/shared/address'
import type { ProofEntity } from '@/lib/types'

interface ProofInfoCardProps {
  proof: ProofEntity
  chainId: number
}

export function ProofInfoCard({ proof, chainId }: ProofInfoCardProps) {
  return (
    <Card className="border-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Proof Information</CardTitle>
          {proof.verified !== undefined ? (
            <Badge variant={proof.verified ? 'default' : 'destructive'} className="text-lg">
              {proof.verified ? 'Valid' : 'Invalid'}
            </Badge>
          ) : null}
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

        {proof.proverAddress ? (
          <div>
            <div className="text-sm font-bold text-muted-foreground">Prover Address</div>
            <div className="mt-1">
              <Address address={proof.proverAddress} chainId={chainId} />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
