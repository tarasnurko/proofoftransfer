import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Address } from '@/components/shared/address'
import { EnsAddress } from '@/components/shared/ens-address'
import { CopyHash } from '@/components/shared/copy-hash'
import { ChainBadge } from '@/components/shared/chain-badge'
import { formatDateTime, formatCountConstraint } from '@/utils/format.utils'
import type { ClaimEntity } from '@/types'
import type { Nullable } from '@/types/common.types'

interface ClaimInfoCardProps {
  claim: ClaimEntity
  ensName?: Nullable<string>
  title?: string
}

export function ClaimInfoCard({
  claim,
  ensName,
  title = 'Information',
}: ClaimInfoCardProps) {
  return (
    <Card className="border-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
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
              <span className="border-2 px-1.5 py-0.5 text-xs font-bold uppercase">{claim.tokenType}</span>
              <Address address={claim.tokenAddress} chainId={claim.chainId} chars={6} />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground">Counterparty</div>
            <div className="mt-1">
              <EnsAddress address={claim.counterpartyAddress} ensName={ensName} chainId={claim.chainId} />
            </div>
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground">Prover Role</div>
            <div className="mt-1 font-bold">{claim.isProverSender ? 'Sender' : 'Recipient'}</div>
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground">Created</div>
            <div className="mt-1">{formatDateTime(claim.createdAt)}</div>
          </div>
          {(claim.minTransfersCount > 0 || claim.maxTransfersCount > 0) ? (
            <div>
              <div className="text-sm font-bold text-muted-foreground">Transfer Count</div>
              <div className="mt-1">
                {formatCountConstraint(claim.minTransfersCount, claim.maxTransfersCount)}
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <div className="text-sm font-bold text-muted-foreground">Period</div>
          <div className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
            <span className="font-bold">From:</span>
            <span>
              {claim.fromBlockTimestamp ? (
                <>{formatDateTime(claim.fromBlockTimestamp * 1000)} <span className="text-muted-foreground">({claim.fromBlockTimestamp})</span></>
              ) : (
                <span className="text-muted-foreground">Not specified</span>
              )}
            </span>
            <span className="font-bold">To:</span>
            <span>
              {claim.toBlockTimestamp ? (
                <>{formatDateTime(claim.toBlockTimestamp * 1000)} <span className="text-muted-foreground">({claim.toBlockTimestamp})</span></>
              ) : (
                <>{formatDateTime(claim.createdAt)} <span className="text-muted-foreground">({Math.floor(new Date(claim.createdAt).getTime() / 1000)})</span></>
              )}
            </span>
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
