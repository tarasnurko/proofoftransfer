import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getClaimByIdAction } from '@/actions/claims'
import { ProofsList } from '@/components/proofs-list'
import AppHeader from '@/components/app-header'

function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatFullAddress(address: string): string {
  return address
}

function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return 'No constraint'
  return format(new Date(timestamp * 1000), 'PPpp')
}

export default async function ClaimDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const result = await getClaimByIdAction(params.id)

  if (!result.success || !result.data) {
    notFound()
  }

  const claim = result.data

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-6xl">
          {/* Back Button */}
          <Link href="/">
            <Button
              variant="outline"
              className="mb-6 border-2 border-foreground bg-background font-bold uppercase hover:bg-foreground hover:text-background"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Claims
            </Button>
          </Link>

          {/* Page Header */}
          <div className="mb-12 border-l-8 border-accent pl-6">
            <h2 className="text-5xl font-bold uppercase leading-tight text-foreground">
              CLAIM DETAILS
            </h2>
            <p className="mt-2 font-mono text-sm text-muted-foreground">
              ID: {formatAddress(claim.id)}
            </p>
          </div>

          <div className="space-y-8">
            {/* Claim Information */}
            <div className="border-4 border-foreground bg-background p-6">
              <div className="mb-6 border-b-2 border-foreground pb-2">
                <h3 className="text-xl font-bold uppercase text-foreground">CLAIM MESSAGE</h3>
              </div>
              <p className="text-lg text-foreground">{claim.message}</p>
            </div>

            {/* Claim Metadata Grid */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Addresses */}
              <div className="border-4 border-foreground bg-background p-6">
                <div className="mb-6 border-b-2 border-foreground pb-2">
                  <h3 className="text-xl font-bold uppercase text-foreground">ADDRESSES</h3>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Token Contract
                    </div>
                    <a
                      href={`https://basescan.org/address/${claim.token_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block break-all text-accent hover:underline"
                    >
                      {formatFullAddress(claim.token_address)}
                    </a>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Recipient
                    </div>
                    <a
                      href={`https://basescan.org/address/${claim.recipient_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block break-all text-accent hover:underline"
                    >
                      {formatFullAddress(claim.recipient_address)}
                    </a>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Creator
                    </div>
                    <a
                      href={`https://basescan.org/address/${claim.creator_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block break-all text-accent hover:underline"
                    >
                      {formatFullAddress(claim.creator_address)}
                    </a>
                  </div>
                </div>
              </div>

              {/* Constraints */}
              <div className="border-4 border-foreground bg-background p-6">
                <div className="mb-6 border-b-2 border-foreground pb-2">
                  <h3 className="text-xl font-bold uppercase text-foreground">CONSTRAINTS</h3>
                </div>
                <div className="space-y-4 font-mono text-sm">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Amount Range
                    </div>
                    <div className="mt-1 text-foreground">
                      Min: {claim.min_transfers_sum === '0' ? 'No constraint' : claim.min_transfers_sum}
                      <br />
                      Max: {claim.max_transfers_sum === '0' ? 'No constraint' : claim.max_transfers_sum}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Time Range
                    </div>
                    <div className="mt-1 text-foreground">
                      From: {formatTimestamp(claim.from_block_timestamp)}
                      <br />
                      To: {formatTimestamp(claim.to_block_timestamp)}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Chain
                    </div>
                    <div className="mt-1 text-foreground">
                      {claim.chain_id === 8453 ? 'Base' : `Chain ID: ${claim.chain_id}`}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Created
                    </div>
                    <div className="mt-1 text-foreground">
                      {format(new Date(claim.created_at), 'PPpp')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Hash (for circuit) */}
            <div className="border-4 border-foreground bg-background p-6">
              <div className="mb-6 border-b-2 border-foreground pb-2">
                <h3 className="text-xl font-bold uppercase text-foreground">
                  TECHNICAL DETAILS
                </h3>
              </div>
              <div className="font-mono text-sm">
                <div className="font-bold uppercase tracking-wide text-muted-foreground">
                  Message Hash (Poseidon2)
                </div>
                <div className="mt-1 break-all text-foreground">{claim.message_hash}</div>
                <p className="mt-2 text-xs text-muted-foreground">
                  This hash is used as the claim_id in the ZK circuit
                </p>
              </div>
            </div>

            {/* Proofs Section */}
            <ProofsList claimId={claim.id} />

            {/* Generate Proof CTA */}
            <div className="border-4 border-accent bg-accent/10 p-8 text-center">
              <h3 className="mb-4 text-2xl font-bold uppercase text-foreground">
                GENERATE A PROOF
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Prove that you meet the criteria for this claim using zero-knowledge proofs
              </p>
              <Link href={`/proof?claim=${claim.id}`}>
                <Button className="border-2 border-foreground bg-accent px-8 py-6 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background">
                  Generate Proof
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
