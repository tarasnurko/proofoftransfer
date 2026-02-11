'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CopyHash } from '@/components/shared/copy-hash'
import { VerificationStats } from '@/components/shared/verification-stats'
import { formatDateTime } from '@/utils/format.utils'
import type { ProofEntity } from '@/types'

interface ProofInfoCardProps {
  proof: ProofEntity
}

export function ProofInfoCard({ proof }: ProofInfoCardProps) {
  return (
    <Card className="border-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold">Proof Information</CardTitle>
          <div className="flex items-center gap-3">
            {proof.verificationStats ? (
              <VerificationStats stats={proof.verificationStats} />
            ) : null}
            {proof.verified !== undefined ? (
              <Badge variant={proof.verified ? 'default' : 'destructive'} className="text-lg">
                {proof.verified ? 'Valid' : 'Invalid'}
              </Badge>
            ) : null}
          </div>
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

        <div>
          <div className="text-sm font-bold text-muted-foreground">Submitted</div>
          <div className="mt-1">{formatDateTime(proof.createdAt)}</div>
        </div>
      </CardContent>
    </Card>
  )
}
