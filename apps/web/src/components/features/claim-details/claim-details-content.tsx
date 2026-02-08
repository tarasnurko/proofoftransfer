'use client'

import { useState, useMemo, useCallback } from 'react'
import { useConnection, useWalletClient } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimInfoCard } from './claim-info-card'
import { TransfersCard } from './transfers-card'
import { GenerateProofCard } from './generate-proof-card'
import { ProofsSection } from './proofs-section'
import type { ClaimEntity, EtherscanTransfer } from '@/lib/types'
import { toast } from 'sonner'
import { assembleCircuitInputs, generateProofFromPrepared } from '@/lib/proof-generator'
import type { PreparedProofData, ServerSigningData } from '@/lib/proof-generator'
import { submitProofAction, prepareClaimSigningDataAction } from '@/actions/proofs.actions'
import { signClaimAndDeriveNullifier, recoverAndVerifyPublicKey } from '@/lib/eip712-claim-signer'

interface ClaimDetailsContentProps {
  claim: ClaimEntity
  transfers: EtherscanTransfer[]
}

export function ClaimDetailsContent({ claim, transfers }: ClaimDetailsContentProps) {
  const claimId = claim.id
  const { address: walletAddress, isConnected } = useConnection()
  const { data: walletClient } = useWalletClient()
  const { open } = useAppKit()
  const queryClient = useQueryClient()

  const [showOnlyMyTransfers, setShowOnlyMyTransfers] = useState(false)
  const [preparedProof, setPreparedProof] = useState<PreparedProofData | null>(null)
  const [signingClaim, setSigningClaim] = useState(false)
  const [generatingProof, setGeneratingProof] = useState(false)

  const displayedTransfers = useMemo(() => {
    if (!showOnlyMyTransfers || !walletAddress) return transfers
    return transfers.filter(t => t.from.toLowerCase() === walletAddress.toLowerCase())
  }, [transfers, showOnlyMyTransfers, walletAddress])

  const userTransferCount = useMemo(() => {
    if (!walletAddress) return 0
    return transfers.filter(t => t.from.toLowerCase() === walletAddress.toLowerCase()).length
  }, [transfers, walletAddress])

  const handleSignClaim = useCallback(async () => {
    if (!walletAddress || !walletClient || !claim) return

    setSigningClaim(true)
    try {
      const result = await prepareClaimSigningDataAction({ claimId, proverAddress: walletAddress })
      if (result?.serverError) throw new Error(result.serverError)
      if (!result?.data) throw new Error('Failed to prepare signing data')

      const serverData = result.data as ServerSigningData
      const signResult = await signClaimAndDeriveNullifier(walletClient, serverData.eip712)
      const pubKeyComponents = await recoverAndVerifyPublicKey(
        signResult.signature,
        signResult.domain,
        signResult.message,
        walletAddress,
      )

      const prepared = assembleCircuitInputs(
        serverData,
        { nullifier: signResult.nullifier, fullSignature: signResult.fullSignature },
        signResult.walletChainId,
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
      await queryClient.invalidateQueries({ queryKey: ['proofs', claimId] })
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
        <ClaimInfoCard claim={claim} />

        <TransfersCard
          claim={claim}
          transfers={transfers}
          displayedTransfers={displayedTransfers}
          userTransferCount={userTransferCount}
          isConnected={isConnected}
          showOnlyMyTransfers={showOnlyMyTransfers}
          onToggleMyTransfers={() => setShowOnlyMyTransfers(prev => !prev)}
          walletAddress={walletAddress}
        />

        <GenerateProofCard
          claimId={claimId}
          chainId={claim.chainId}
          isConnected={isConnected}
          walletAddress={walletAddress}
          preparedProof={preparedProof}
          userTransferCount={userTransferCount}
          signingClaim={signingClaim}
          generatingProof={generatingProof}
          onConnect={() => open()}
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
