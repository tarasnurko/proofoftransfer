import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getClaimByIdAction } from "@/actions/claims";
import { ProofsList } from "@/components/proofs-list";
import { ProofGeneratorSection } from "@/components/proof-generator-section";
import AppHeader from "@/components/app-header";
import { ChainId } from "@repo/types";

function formatAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatFullAddress(address: string): string {
  return address;
}

function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return "No constraint";
  return format(new Date(timestamp * 1000), "PPpp");
}

function getChainName(chainId: number): string {
  switch (chainId) {
    case ChainId.ETHEREUM:
      return 'Ethereum'
    case ChainId.OPTIMISM:
      return 'Optimism'
    case ChainId.BNB:
      return 'BNB Chain'
    case ChainId.POLYGON:
      return 'Polygon'
    case ChainId.BASE:
      return 'Base'
    case ChainId.ARBITRUM:
      return 'Arbitrum'
    case ChainId.SCROLL:
      return 'Scroll'
    default:
      return `Chain ${chainId}`
  }
}

function getBlockExplorerUrl(chainId: number): string {
  switch (chainId) {
    case ChainId.ETHEREUM:
      return 'https://etherscan.io'
    case ChainId.OPTIMISM:
      return 'https://optimistic.etherscan.io'
    case ChainId.BNB:
      return 'https://bscscan.com'
    case ChainId.POLYGON:
      return 'https://polygonscan.com'
    case ChainId.BASE:
      return 'https://basescan.org'
    case ChainId.ARBITRUM:
      return 'https://arbiscan.io'
    case ChainId.SCROLL:
      return 'https://scrollscan.com'
    default:
      return 'https://etherscan.io'
  }
}

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getClaimByIdAction(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const claim = result.data;

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
                        href={`${getBlockExplorerUrl(claim.chain_id)}/address/${claim.token_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all text-accent hover:underline"
                      >
                        {formatFullAddress(claim.token_address)}
                      </a>
                    </div>
                  ) : (
                    <a
                      href={`${getBlockExplorerUrl(claim.chain_id)}/address/${claim.token_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block break-all text-accent hover:underline"
                    >
                      {formatFullAddress(claim.token_address)}
                    </a>
                  )}
                </div>

                {/* Recipient */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Recipient
                  </div>
                  <a
                    href={`${getBlockExplorerUrl(claim.chain_id)}/address/${claim.recipient_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-accent hover:underline"
                  >
                    {formatFullAddress(claim.recipient_address)}
                  </a>
                </div>

                {/* Chain */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Chain
                  </div>
                  <div className="mt-1 text-foreground">
                    {getChainName(claim.chain_id)}
                  </div>
                </div>

                {/* Created */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Created
                  </div>
                  <div className="mt-1 text-foreground">
                    {format(new Date(claim.created_at), "PPpp")}
                  </div>
                </div>

                {/* Amount Range */}
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Amount Range
                  </div>
                  <div className="mt-1 text-foreground">
                    Min: {claim.min_transfers_sum === "0" ? "No constraint" : claim.min_transfers_sum}
                    <br />
                    Max: {claim.max_transfers_sum === "0" ? "No constraint" : claim.max_transfers_sum}
                  </div>
                </div>

                {/* Time Range */}
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

                {/* Message Hash */}
                <div className="md:col-span-2">
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Message Hash (Poseidon2)
                  </div>
                  <div className="mt-1 break-all text-foreground">
                    {claim.message_hash}
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
            <ProofsList claimId={claim.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
