'use client';

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Address } from '@/components/shared/address'
import { EnsAddress } from '@/components/shared/ens-address'
import { CopyHash } from '@/components/shared/copy-hash'
import { ChainBadge } from '@/components/shared/chain-badge'
import { formatTokenAmount, formatDate, formatCountConstraint } from '@/utils/format.utils'
import type { ClaimEntity } from '@/types'
import type { Nullable } from '@/types/common.types'
import { Clock, Hash, Target, TrendingUp, User } from 'lucide-react'

function formatClaimTimestamp(timestamp: number) {
  if (!timestamp) return null
  return formatDate(timestamp * 1000)
}

function formatClaimAmount(
  amount: string,
  token: ClaimEntity['token'],
) {
  if (amount === '0') return null
  return token
    ? formatTokenAmount(amount, token.decimals, token.symbol)
    : `${BigInt(amount)}`
}

function getAmountConstraint(minAmount: string | null, maxAmount: string | null) {
  if (minAmount && maxAmount) return `${minAmount} - ${maxAmount}`
  if (minAmount) return `Min: ${minAmount}`
  if (maxAmount) return `Max: ${maxAmount}`
  return 'No constraints'
}

interface ClaimCardProps {
  claim: ClaimEntity
  ensName?: Nullable<string>
}

export function ClaimCard({ claim, ensName }: ClaimCardProps) {
  const tokenDisplay = useMemo(() => {
    if (claim.token) return `${claim.token.name} (${claim.token.symbol})`
    return <Address address={claim.tokenAddress} chars={6} showCopy={false} />
  }, [claim.token, claim.tokenAddress])

  const minAmount = formatClaimAmount(claim.minTransfersSum, claim.token)
  const maxAmount = formatClaimAmount(claim.maxTransfersSum, claim.token)

  return (
    <Card className="flex flex-col border-4 transition-all hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(200,200,200,0.3)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <CardDescription className="font-mono text-xs">
              ID: {claim.id.slice(0, 8)}...
            </CardDescription>
            <CardTitle className="text-pretty leading-tight">{claim.message}</CardTitle>
          </div>
          <Badge variant="secondary" className="shrink-0 border-2 font-bold whitespace-nowrap">
            {claim.proofCount} {claim.proofCount === 1 ? 'Proof' : 'Proofs'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="grid gap-2 rounded border-2 border-border bg-secondary/30 p-3 text-sm">
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <span className="font-bold">Chain:</span>
            <ChainBadge chainId={claim.chainId} />
          </div>
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <span className="font-bold">Token:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{tokenDisplay}</span>
              <span className="border px-1 text-[10px] font-bold uppercase">{claim.tokenType}</span>
              <CopyHash hash={claim.tokenAddress} chars={0} />
            </div>
          </div>
          <div className="grid grid-cols-[80px_1fr] items-start gap-2">
            <span className="font-bold">Counterparty:</span>
            <EnsAddress address={claim.counterpartyAddress} ensName={ensName} chainId={claim.chainId} />
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="grid grid-cols-[20px_70px_1fr] items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">Prover:</span>
            <span>{claim.isProverSender ? 'Sender' : 'Recipient'}</span>
          </div>

          <div className="grid grid-cols-[20px_70px_1fr] items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">Amount:</span>
            <span>{getAmountConstraint(minAmount, maxAmount)}</span>
          </div>

          {(claim.minTransfersCount > 0 || claim.maxTransfersCount > 0) ? (
            <div className="grid grid-cols-[20px_70px_1fr] items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold">Count:</span>
              <span>{formatCountConstraint(claim.minTransfersCount, claim.maxTransfersCount)}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-[20px_70px_1fr] items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">Period:</span>
            <span>
              {formatClaimTimestamp(claim.fromBlockTimestamp) || '...'} – {formatClaimTimestamp(claim.toBlockTimestamp) || formatDate(claim.createdAt)}
            </span>
          </div>

          <div className="grid grid-cols-[20px_70px_1fr] items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">Created:</span>
            <span>{formatDate(claim.createdAt)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto">
        <Button asChild className="w-full">
          <Link href={`/claims/${claim.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
