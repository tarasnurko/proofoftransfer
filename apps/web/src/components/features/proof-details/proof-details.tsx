'use client'

import React, { useState, useCallback } from 'react'
import { useConnection, useWalletClient, useChainId, useSwitchChain } from 'wagmi'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMounted } from '@/hooks/use-mounted'
import { useAppKit } from '@reown/appkit/react'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimInfoCard } from '@/components/features/claim-details/claim-info-card'
import { ProofInfoCard } from './proof-info-card'
import { VerifyProofCard } from './verify-proof-card'
import type { ClaimEntity, ProofEntity, EtherscanTransfer } from '@/types'
import { toast } from 'sonner'
import { formatNullifier } from '@/utils/format.utils'
import { QUERY_KEYS } from '@/constants'
import { verifyProofAction } from '@/actions/proofs.actions'
import { useGetVerifierStatus } from '@/hooks/queries'
import { api } from '@/lib/api/client'
import { signClaimAndDeriveNullifier } from '@/lib/proof'
import { parseEtherscanCsv } from '@/lib/etherscan-csv'
import { buildMerkleRootClient } from '@/lib/merkle-client'

interface ProofDetailsProps {
  claim: ClaimEntity
  proof: ProofEntity
}

export function ProofDetails({ claim, proof: initialProof }: ProofDetailsProps) {
  const claimId = claim.id
  const proofId = initialProof.id

  const { isConnected: rawIsConnected } = useConnection()
  const { data: walletClient } = useWalletClient()
  const walletChainId = useChainId()
  const { switchChain, isPending: switchingChain } = useSwitchChain()
  const { open } = useAppKit()
  const queryClient = useQueryClient()
  const mounted = useMounted()
  const isConnected = mounted && rawIsConnected

  const [proof, setProof] = useState(initialProof)
  const [csvFiles, setCsvFiles] = useState<Array<{ name: string; transfers: EtherscanTransfer[] }>>([])

  // ── Sign Claim ──────────────────────────────────────────────
  const signMutation = useMutation({
    mutationFn: async () => {
      if (!walletClient) throw new Error('Wallet not connected')
      const prepRes = await api.api.claims[':id']['verifier-signing-data'].$get({
        param: { id: claimId },
      })
      if (!prepRes.ok) throw new Error('Failed to prepare signing data')
      const { eip712, chainId } = await prepRes.json()
      const signResult = await signClaimAndDeriveNullifier(walletClient, eip712, chainId)
      return formatNullifier(signResult.nullifier)
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to sign claim'),
  })

  const derivedNullifier = signMutation.data ?? null

  // ── Fetch Transfers ─────────────────────────────────────────
  const fetchTransfersMutation = useMutation({
    mutationFn: async () => {
      const res = await api.api.claims[':id'].transfers.$get({
        param: { id: claimId },
      })
      if (!res.ok) throw new Error('Failed to fetch transfers')
      return await res.json() as EtherscanTransfer[]
    },
    onError: () => toast.error('Failed to fetch transfers'),
  })

  const transfers = fetchTransfersMutation.data ?? []

  // ── Verify Proof ────────────────────────────────────────────
  const verifyMutation = useMutation({
    mutationFn: async ({ nullifier, allTransfers }: { nullifier: string; allTransfers: EtherscanTransfer[] }) => {
      const verifyTransfers = allTransfers.map((t) => ({
        from: t.from,
        to: t.to,
        contractAddress: t.contractAddress,
        value: t.value,
        timeStamp: t.timeStamp,
        hash: t.hash,
      }))

      const merkleRoot = await buildMerkleRootClient(verifyTransfers)

      const result = await verifyProofAction({
        id: proofId,
        nullifier,
        merkleRoot,
      })

      if (result?.serverError) throw new Error(result.serverError)
      return result?.data
    },
    onSuccess: async (data) => {
      if (data?.isValid) {
        toast.success('Proof verified successfully!')
      } else {
        toast.error(data?.error || 'Proof verification failed')
      }

      if (data?.stats) {
        setProof(prev => ({
          ...prev,
          verificationStats: {
            successful: data.stats.successful,
            failed: data.stats.failed,
          },
        }))
        await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.VERIFIER_STATUS, proofId] })
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to verify proof'),
  })

  const { data: verifierStatus } = useGetVerifierStatus({ claimId, proofId, nullifier: derivedNullifier })

  const allTransfers = [
    ...transfers,
    ...csvFiles.flatMap((f) => f.transfers),
  ]

  const isSelfVerify = derivedNullifier ? derivedNullifier === proof.nullifier : false

  const verificationError = (() => {
    if (verifyMutation.isPending) return null
    if (verifyMutation.isError) {
      return verifyMutation.error instanceof Error ? verifyMutation.error.message : 'Failed to verify proof'
    }
    if (verifyMutation.data && !verifyMutation.data.isValid) {
      return verifyMutation.data.error || 'Proof verification failed'
    }
    return null
  })()

  const handleVerify = useCallback(() => {
    if (!derivedNullifier || !allTransfers.length) return
    verifyMutation.mutate({ nullifier: derivedNullifier, allTransfers })
  }, [derivedNullifier, allTransfers, verifyMutation])

  const handleCsvUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (csvFiles.length >= 3) {
      toast.error('Maximum 3 CSV files allowed')
      e.target.value = ''
      return
    }

    try {
      const text = await file.text()
      const parsed = parseEtherscanCsv({
        text,
        tokenAddress: claim.tokenAddress,
        tokenDecimals: claim.token?.decimals ?? 18,
        tokenType: claim.tokenType,
      })
      setCsvFiles(prev => [...prev, { name: file.name, transfers: parsed }])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse CSV')
    } finally {
      e.target.value = ''
    }
  }, [csvFiles.length, claim.tokenAddress, claim.token?.decimals, claim.tokenType])

  const handleRemoveCsv = useCallback((index: number) => {
    setCsvFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const previousAttempt = verifierStatus?.hasAttempted ? verifierStatus : null
  const alreadyVerified = previousAttempt?.isValid ?? false

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href={`/claims/${claimId}`} label="Back to Claim" />
        <CopyLinkButton />
      </div>

      <PageHeader title="Proof Details" />

      <div className="space-y-6">
        <ClaimInfoCard claim={claim} title="Claim Information" />
        <ProofInfoCard proof={proof} />
        <VerifyProofCard
          proof={proof}
          claim={claim}
          transfers={transfers}
          csvFiles={csvFiles}
          verifying={verifyMutation.isPending}
          verificationError={verificationError}
          fetchingTransfers={fetchTransfersMutation.isPending}
          isConnected={isConnected}
          alreadyVerified={alreadyVerified}
          isSelfVerify={isSelfVerify}
          derivedNullifier={derivedNullifier}
          signingClaim={signMutation.isPending}
          hasTransfers={!!allTransfers.length}
          previousAttempt={previousAttempt}
          walletChainId={walletChainId}
          switchingChain={switchingChain}
          onVerify={handleVerify}
          onConnectWallet={() => open()}
          onSignClaim={() => signMutation.mutate()}
          onSwitchChain={() => switchChain({ chainId: claim.chainId })}
          onFetchTransfers={() => fetchTransfersMutation.mutate()}
          onCsvUpload={handleCsvUpload}
          onRemoveCsv={handleRemoveCsv}
        />
      </div>
    </>
  )
}
