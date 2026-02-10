import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Address } from '@/components/shared/address'
import { CopyHash } from '@/components/shared/copy-hash'
import { ChainBadge } from '@/components/shared/chain-badge'
import { format } from 'date-fns'
import type { ClaimEntity } from '@/types'

interface ClaimInfoCardProps {
  claim: ClaimEntity
}

export function ClaimInfoCard({ claim }: ClaimInfoCardProps) {
  return (
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
            <div className="mt-1"><ChainBadge chainId={claim.chainId} /></div>
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground">Token</div>
            <div className="mt-1 flex items-center gap-2">
              {claim.token ? `${claim.token.name} (${claim.token.symbol})` : 'Unknown'}
              <Address address={claim.tokenAddress} chainId={claim.chainId} chars={6} />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground">Recipient</div>
            <div className="mt-1">
              <Address address={claim.recipientAddress} chainId={claim.chainId} />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground">Created</div>
            <div className="mt-1">{format(new Date(claim.createdAt), 'dd.MM.yyyy HH:mm')}</div>
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
  )
}
