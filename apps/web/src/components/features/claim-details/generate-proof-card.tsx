'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Address } from '@/components/shared/address'
import { CopyHash } from '@/components/shared/copy-hash'
import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/constants'
import { checkNullifierForClaimExistsAction } from '@/actions/proofs.actions'
import type { PreparedProofData } from '@/lib/proof-generator'
import { useAppKit } from '@reown/appkit/react'
import { Check, Loader2, Shield, Wallet } from 'lucide-react'

interface GenerateProofCardProps {
  claimId: string
  chainId: number
  isConnected: boolean
  walletAddress?: string
  preparedProof: PreparedProofData | null
  userTransferCount: number
  transfersLoading?: boolean
  signingClaim: boolean
  generatingProof: boolean
  onSignClaim: () => void
  onGenerateProof: () => void
}

export function GenerateProofCard({
  claimId,
  chainId,
  isConnected,
  walletAddress,
  preparedProof,
  userTransferCount,
  transfersLoading,
  signingClaim,
  generatingProof,
  onSignClaim,
  onGenerateProof,
}: GenerateProofCardProps) {
  const { open } = useAppKit()

  const { data: nullifierAlreadyUsed = false } = useQuery({
    queryKey: [QUERY_KEYS.NULLIFIER_EXISTS, claimId, preparedProof?.nullifier],
    queryFn: async () => {
      const result = await checkNullifierForClaimExistsAction({
        claimId,
        nullifier: preparedProof!.nullifier,
      })
      return result?.data?.exists ?? false
    },
    enabled: !!preparedProof,
  })

  return (
    <Card className="border-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Generate Proof</CardTitle>
        <CardDescription>
          Prove your transfers match this claim using zero-knowledge
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isConnected ? (
          <div className="border-4 border-dashed border-border p-8 text-center">
            <Wallet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-bold">Connect Your Wallet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Connect your wallet to generate a proof
            </p>
            <Button onClick={() => open()} className="border-4 font-bold">
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          </div>
        ) : !preparedProof ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              <span className="font-bold">Connected:</span>
              <Address address={walletAddress!} chainId={chainId} />
            </div>

            {transfersLoading ? (
              <div className="border-4 border-dashed border-border p-6">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-12 w-12" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-10 w-36" />
                </div>
              </div>
            ) : userTransferCount > 0 ? (
              <div className="border-4 border-dashed border-border p-6 text-center">
                <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-bold">Sign Claim</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Sign the EIP-712 claim message to generate your unique nullifier
                </p>
                <Button onClick={onSignClaim} disabled={signingClaim} className="border-4 font-bold">
                  {signingClaim && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {signingClaim ? 'Preparing & Signing...' : 'Sign Claim'}
                </Button>
              </div>
            ) : (
              <div className="border-2 border-destructive p-4 text-center text-sm">
                <p className="font-bold text-destructive">No matching transfers found</p>
                <p className="text-muted-foreground">
                  You must have transfers matching this claim to generate a proof
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              <span className="font-bold">Connected:</span>
              <Address address={walletAddress!} chainId={chainId} />
            </div>

            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              <span className="font-bold">Claim Signed</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-sm text-muted-foreground">Nullifier:</span>
              <CopyHash hash={preparedProof.nullifier} chars={10} />
            </div>

            <div className="space-y-3">
              {nullifierAlreadyUsed ? (
                <p className="text-sm text-muted-foreground">
                  Proof already submitted with this nullifier.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{preparedProof.proverTransferCount}</span> matching transfer{preparedProof.proverTransferCount !== 1 ? 's' : ''} ready. Click below to generate the ZK proof.
                  </p>
                  <Button
                    onClick={onGenerateProof}
                    disabled={generatingProof}
                    className="w-full border-4 font-bold"
                  >
                    {generatingProof && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {generatingProof ? 'Generating Proof...' : 'Generate Proof'}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
