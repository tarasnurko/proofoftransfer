'use client'

import { useState, useMemo, useCallback } from 'react'
import { useConnection, useWalletClient } from 'wagmi'
import { useMounted } from '@/hooks/use-mounted'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { QUERY_KEYS } from '@/constants'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimInfoCard } from './claim-info-card'
import { TransfersCard } from './transfers-card'
import { GenerateProofCard } from './generate-proof-card'
import { ProofsSection } from './proofs-section'
import { isAddressEqual, type Address } from 'viem'
import { toast } from 'sonner'
import type { ClaimEntity } from '@/types'
import type { Nullable } from '@/types/common.types'
import { assembleCircuitInputs, generateProofFromPrepared, signClaimAndDeriveNullifier, recoverAndVerifyPublicKey } from '@/lib/proof'
import type { PreparedProofData, ServerSigningData } from '@/lib/proof'
import { submitProofAction } from '@/actions/proofs.actions'
import { api } from '@/lib/api/client'
import { useGetTransfersByClaimId } from '@/hooks/queries'

interface ClaimDetailsProps {
  claim: ClaimEntity
  ensName?: Nullable<string>
}

export function ClaimDetails({ claim, ensName }: ClaimDetailsProps) {
  const claimId = claim.id
  const { address: walletAddress, isConnected: rawIsConnected } = useConnection()
  const { data: walletClient } = useWalletClient()
  const queryClient = useQueryClient()
  const mounted = useMounted()
  const isConnected = mounted && rawIsConnected

  const { data: transfers = [], isLoading: transfersLoading } = useGetTransfersByClaimId(claimId)

  const [showOnlyMyTransfers, setShowOnlyMyTransfers] = useState(false)
  const [preparedProof, setPreparedProof] = useState<PreparedProofData | null>(null)
  const [signingClaim, setSigningClaim] = useState(false)
  const [generatingProof, setGeneratingProof] = useState(false)

  const userTransfers = useMemo(() => {
    if (!walletAddress) return []
    return transfers.filter(t => isAddressEqual(t.from as Address, walletAddress as Address))
  }, [transfers, walletAddress])

  const displayedTransfers = showOnlyMyTransfers ? userTransfers : transfers
  const userTransferCount = userTransfers.length

  const handleSignClaim = useCallback(async () => {
    if (!walletAddress || !walletClient || !claim) return

    setSigningClaim(true)
    try {
      const res = await api.api.claims[':id']['prover-signing-data'].$post({
        param: { id: claimId },
        json: { proverAddress: walletAddress },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Failed to prepare signing data' }))
        throw new Error((body as { error?: string }).error || 'Failed to prepare signing data')
      }

      const serverData = await res.json() as ServerSigningData

      const signResult = await signClaimAndDeriveNullifier(walletClient, serverData.eip712, serverData.chainId)
      const pubKeyComponents = await recoverAndVerifyPublicKey(
        signResult.signature,
        signResult.typedData,
        walletAddress,
      )

      const prepared = assembleCircuitInputs(
        serverData,
        { nullifier: signResult.nullifier, fullSignature: signResult.fullSignature },
        pubKeyComponents,
      )

      setPreparedProof(prepared)
      toast.success('Claim signed successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign claim')
    } finally {
      setSigningClaim(false)
    }
  }, [walletAddress, walletClient, claim, claimId])

  const handleGenerateProof = useCallback(async () => {
    if (!preparedProof) return

    setGeneratingProof(true)
    try {
      const generated = await generateProofFromPrepared(preparedProof)

      const submitResult = await submitProofAction({
        claimId,
        nullifier: generated.nullifier,
        proofData: generated.proofData,
        publicInputs: generated.publicInputs,
      })

      if (submitResult?.serverError) {
        throw new Error(submitResult.serverError)
      }

      if (submitResult?.validationErrors) {
        const { fieldErrors } = submitResult.validationErrors as { fieldErrors?: Record<string, string[] | undefined> }
        const firstError = fieldErrors
          ? Object.values(fieldErrors).flat().find(Boolean)
          : undefined
        throw new Error(firstError || 'Validation failed')
      }

      toast.success('Proof generated and submitted!')
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PROOFS, claimId] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate proof')
    } finally {
      setGeneratingProof(false)
    }
  }, [preparedProof, claimId, queryClient])

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href="/" label="Back to Claims" />
        <CopyLinkButton />
      </div>

      <PageHeader
        title="Claim Details"
        actions={
          claim.proofCount > 0 ? (
            <Badge className="shrink-0 whitespace-nowrap border-2 text-sm font-bold">
              {claim.proofCount} Proof{claim.proofCount !== 1 ? 's' : ''}
            </Badge>
          ) : undefined
        }
      />

      <div className="space-y-6">
        <ClaimInfoCard claim={claim} ensName={ensName} />

        <TransfersCard
          claim={claim}
          transfers={transfers}
          displayedTransfers={displayedTransfers}
          userTransferCount={userTransferCount}
          isConnected={isConnected}
          showOnlyMyTransfers={showOnlyMyTransfers}
          onToggleMyTransfers={() => setShowOnlyMyTransfers(prev => !prev)}
          walletAddress={walletAddress}
          isLoading={transfersLoading}
        />

        <GenerateProofCard
          claimId={claimId}
          chainId={claim.chainId}
          isConnected={isConnected}
          walletAddress={walletAddress}
          preparedProof={preparedProof}
          userTransferCount={userTransferCount}
          transfersLoading={transfersLoading}
          signingClaim={signingClaim}
          generatingProof={generatingProof}
          onSignClaim={handleSignClaim}
          onGenerateProof={handleGenerateProof}
        />

        <ProofsSection
          claimId={claimId}
          preparedProof={preparedProof}
        />
      </div>
    </>
  )
}
