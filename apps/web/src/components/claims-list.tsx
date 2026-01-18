'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

type Claim = {
  id: string
  message: string
  tokenAddress: string
  recipientAddress: string
  minAmount: string
  proofCount: number
}

// Mock claims data - replace with actual data fetching
const mockClaims: Claim[] = [
  {
    id: '0x1234...5678',
    message: 'Have you transferred at least 100 USDC to Alice in the previous week?',
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    minAmount: '100',
    proofCount: 5,
  },
  {
    id: '0x5678...1234',
    message: 'Prove you donated more than 0.1 ETH to the charity address',
    tokenAddress: '0x0000000000000000000000000000000000000000',
    recipientAddress: '0x123d35Cc6634C0532925a3b844Bc9e7595f0xyz',
    minAmount: '0.1',
    proofCount: 12,
  },
  {
    id: '0xabcd...efgh',
    message: 'Verify transfer of 500+ DAI tokens within January 2024',
    tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    recipientAddress: '0xabc35Cc6634C0532925a3b844Bc9e7595f0def',
    minAmount: '500',
    proofCount: 3,
  },
]

export function ClaimsList() {
  const claims = mockClaims

  if (claims.length === 0) {
    return (
      <div className="border-4 border-foreground bg-background p-12 text-center">
        <h3 className="mb-2 text-xl font-bold uppercase text-foreground">
          NO CLAIMS YET
        </h3>
        <p className="mb-6 text-sm text-muted-foreground">
          Be the first to create a transfer claim
        </p>
        <Link href="/create">
          <Button className="border-2 border-foreground bg-accent px-8 py-4 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background">
            Create Claim <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {claims.map((claim) => (
        <div
          key={claim.id}
          className="border-4 border-foreground bg-background p-6 transition-all hover:border-accent"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 font-mono text-sm text-muted-foreground">
                ID: {claim.id}
              </div>
              <h3 className="text-xl font-bold text-foreground">{claim.message}</h3>
            </div>
            <div className="rounded-none border-2 border-accent bg-accent/10 px-4 py-2 text-center">
              <div className="text-2xl font-bold text-accent">{claim.proofCount}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Proofs
              </div>
            </div>
          </div>

          <div className="mb-4 grid gap-4 font-mono text-sm md:grid-cols-2">
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                Token
              </div>
              <div className="mt-1 break-all text-foreground">{claim.tokenAddress}</div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                Recipient
              </div>
              <div className="mt-1 break-all text-foreground">{claim.recipientAddress}</div>
            </div>
            <div>
              <div className="font-bold uppercase tracking-wide text-muted-foreground">
                Min Amount
              </div>
              <div className="mt-1 text-foreground">{claim.minAmount}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link href={`/proof?claim=${claim.id}`} className="flex-1">
              <Button className="w-full border-2 border-foreground bg-foreground px-6 py-4 font-bold uppercase text-background hover:bg-accent hover:text-accent-foreground">
                Generate Proof <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/claims/${claim.id}`}>
              <Button
                variant="outline"
                className="border-2 border-foreground bg-background px-6 py-4 font-bold uppercase hover:bg-foreground hover:text-background"
              >
                View Details
              </Button>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
