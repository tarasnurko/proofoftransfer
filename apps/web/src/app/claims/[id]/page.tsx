import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProofsList } from '@/components/features/proofs/proofs-list'
import { ProofGeneratorSection } from '@/components/features/proofs/proof-generator-section'
import { AppHeader } from '@/components/layout/app-header'
import { formatAddress } from '@/utils/format'
import { getChainName, getBlockExplorerUrl } from '@/utils/blockchain.utils'
import { QUERY_KEYS, fetchClaimById, fetchProofsByClaimId } from '@/lib/queries'

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
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.claims.detail(id),
    queryFn: () => fetchClaimById(id),
  })

  const claim = queryClient.getQueryData(QUERY_KEYS.claims.detail(id)) as Awaited<ReturnType<typeof fetchClaimById>>

  if (!claim) {
    notFound()
  }

  await queryClient.prefetchQuery({
    queryKey: QUERY_KEYS.proofs.byClaimId(id),
    queryFn: () => fetchProofsByClaimId(id),
  })

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
            {/* Unified Claim Details Card */}
            <div className="border-4 border-foreground bg-background p-6">
              <div className="mb-6 border-b-2 border-foreground pb-2">
                <h3 className="text-xl font-bold uppercase text-foreground">
                  CLAIM DETAILS
                </h3>
              </div>

              {/* Claim Message */}
              <div className="mb-6">
                <div className="mb-2 font-bold uppercase tracking-wide text-muted-foreground">
                  Message
                </div>
                <p className="text-lg text-foreground">{claim.message}</p>
              </div>

              {/* Details Grid */}
              <div className="grid gap-6 font-mono text-sm md:grid-cols-2">
                {/* Token */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Token
                  </div>
                  {claim.token ? (
                    <div className="mt-1">
                      <div className="text-base font-bold text-foreground">
                        {claim.token.name} ({claim.token.symbol})
                      </div>
                      <a
                        href={`${getBlockExplorerUrl(claim.chainId)}/address/${claim.tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all text-accent hover:underline"
                      >
                        {formatFullAddress(claim.tokenAddress)}
                      </a>
                    </div>
                  ) : (
                    <a
                      href={`${getBlockExplorerUrl(claim.chainId)}/address/${claim.tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block break-all text-accent hover:underline"
                    >
                      {formatFullAddress(claim.tokenAddress)}
                    </a>
                  )}
                </div>

                {/* Recipient */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Recipient
                  </div>
                  <a
                    href={`${getBlockExplorerUrl(claim.chainId)}/address/${claim.recipientAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-accent hover:underline"
                  >
                    {formatFullAddress(claim.recipientAddress)}
                  </a>
                </div>

                {/* Chain */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Chain
                  </div>
                  <div className="mt-1 text-foreground">
                    {getChainName(claim.chainId)}
                  </div>
                </div>

                {/* Created */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Created
                  </div>
                  <div className="mt-1 text-foreground">
                    {format(new Date(claim.createdAt), 'PPpp')}
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Amount Range
                  </div>
                  <div className="mt-1 text-foreground">
                    Min: {claim.minTransfersSum === '0' ? 'No constraint' : claim.minTransfersSum}
                    <br />
                    Max: {claim.maxTransfersSum === '0' ? 'No constraint' : claim.maxTransfersSum}
                  </div>
                </div>

                {/* Time Range */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Time Range
                  </div>
                  <div className="mt-1 text-foreground">
                    From: {formatTimestamp(claim.fromBlockTimestamp)}
                    <br />
                    To: {formatTimestamp(claim.toBlockTimestamp)}
                  </div>
                </div>

                {/* Message Hash */}
                <div className="md:col-span-2">
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Message Hash (Poseidon2)
                  </div>
                  <div className="mt-1 break-all text-foreground">
                    {claim.messageHash}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Used as claim_id in ZK circuit
                  </p>
                </div>
              </div>
            </div>

            {/* Generate Proof Section */}
            <div className="border-4 border-accent bg-accent/10 p-8">
              <h3 className="mb-6 text-2xl font-bold uppercase text-foreground">
                GENERATE A PROOF
              </h3>
              <p className="mb-8 text-sm text-muted-foreground">
                Prove that you meet the criteria for this claim using
                zero-knowledge proofs
              </p>
              <ProofGeneratorSection claim={claim} />
            </div>

            {/* Proofs Section */}
            <HydrationBoundary state={dehydrate(queryClient)}>
              <ProofsList claimId={claim.id} />
            </HydrationBoundary>
          </div>
        </div>
      </main>
    </div>
  )
}
