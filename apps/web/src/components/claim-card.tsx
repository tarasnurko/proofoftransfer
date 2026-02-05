'use client';

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Address } from '@/components/address'
import { ClaimEntity, getChainName } from '@/lib/types'
import { formatTokenAmount } from '@/lib/address-utils'
import { Clock, Target, TrendingUp, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface ClaimCardProps {
  claim: ClaimEntity
}

export function ClaimCard({ claim }: ClaimCardProps) {
  const [copiedToken, setCopiedToken] = useState(false)

  const copyTokenAddress = async () => {
    await navigator.clipboard.writeText(claim.tokenAddress)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  // Check if recipient is an ENS name
  const isENS = claim.recipientAddress.endsWith('.eth')

  const tokenDisplay = claim.token
    ? `${claim.token.name} (${claim.token.symbol})`
    : <Address address={claim.tokenAddress} chars={6} showCopy={false} />

  const formatAmount = (amount: string) => {
    if (amount === '0') return null
    return claim.token 
      ? formatTokenAmount(amount, claim.token.decimals, claim.token.symbol)
      : `${BigInt(amount)}`
  }

  const minAmount = formatAmount(claim.minTransfersSum)
  const maxAmount = formatAmount(claim.maxTransfersSum)

  const getAmountConstraint = () => {
    if (minAmount && maxAmount) return `${minAmount} - ${maxAmount}`
    if (minAmount) return `Min: ${minAmount}`
    if (maxAmount) return `Max: ${maxAmount}`
    return 'No constraints'
  }

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return null
    return new Date(timestamp * 1000).toLocaleDateString()
  }

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
            <Badge variant="outline" className="border-2 w-fit">
              {getChainName(claim.chainId)}
            </Badge>
          </div>
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <span className="font-bold">Token:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{tokenDisplay}</span>
              <button
                type="button"
                onClick={copyTokenAddress}
                className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-secondary"
              >
                {copiedToken ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-[80px_1fr] items-center gap-2">
            <span className="font-bold">Recipient:</span>
            {isENS ? (
              <span className="font-mono text-sm">{claim.recipientAddress}</span>
            ) : (
              <Address address={claim.recipientAddress} showCopy={true} />
            )}
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="grid grid-cols-[20px_70px_1fr] items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">Amount:</span>
            <span>{getAmountConstraint()}</span>
          </div>

          {(claim.fromBlockTimestamp !== 0 || claim.toBlockTimestamp !== 0) && (
            <div className="grid grid-cols-[20px_70px_1fr] items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-bold">Period:</span>
              <span>
                {formatDate(claim.fromBlockTimestamp) || 'Any'} - {formatDate(claim.toBlockTimestamp) || 'Any'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-[20px_70px_1fr] items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="font-bold">Created:</span>
            <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto">
        <Button asChild className="w-full border-4 font-bold">
          <Link href={`/claims/${claim.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
