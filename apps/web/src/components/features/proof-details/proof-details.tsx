'use client'

import React, { useState, useCallback } from 'react'
import { useConnection, useWalletClient } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimInfoCard } from '@/components/features/claim-details/claim-info-card'
import { ProofInfoCard } from './proof-info-card'
import { VerifyProofCard } from './verify-proof-card'
import type { ClaimEntity, ProofEntity, EtherscanTransfer } from '@/types'
import { toast } from 'sonner'
import { verifyProofAction } from '@/actions/proofs.actions'
import { api } from '@/lib/api/client'
import { signClaimAndDeriveNullifier } from '@/lib/proof'
import { parseEtherscanCsv } from '@/lib/etherscan-csv'

interface ProofDetailsProps {
  claim: ClaimEntity
  proof: ProofEntity
}

export function ProofDetails({ claim, proof: initialProof }: ProofDetailsProps) {
  const claimId = claim.id
  const proofId = initialProof.id

  const { address: walletAddress, isConnected } = useConnection()
  const { data: walletClient } = useWalletClient()
  const { open } = useAppKit()

  const [proof, setProof] = useState(initialProof)
  const [verifying, setVerifying] = useState(false)
  const [transfers, setTransfers] = useState<EtherscanTransfer[]>([])
  const [fetchingTransfers, setFetchingTransfers] = useState(false)
  const [csvFiles, setCsvFiles] = useState<Array<{ name: string; transfers: EtherscanTransfer[] }>>([])

  const allTransfers = [
    ...transfers,
    ...csvFiles.flatMap((f) => f.transfers),
  ]

  const handleVerify = useCallback(async () => {
    if (!walletAddress || !walletClient || !claim) {
      toast.error('Connect your wallet first')
      return
    }

    if (!allTransfers.length) {
      toast.error('Fetch or upload transfers first')
      return
    }

    setVerifying(true)
    try {
      const prepRes = await api.api.claims[':id']['verifier-signing-data'].$get({
        param: { id: claimId },
      })
      if (!prepRes.ok) throw new Error('Failed to prepare signing data')

      const { eip712, chainId } = await prepRes.json()

      const signResult = await signClaimAndDeriveNullifier(walletClient, eip712, chainId)
      const derivedNullifier = signResult.nullifier

      if (derivedNullifier === proof.nullifier) {
        toast.error('Cannot verify your own proof')
        return
      }

      const verifyTransfers = allTransfers.map((t) => ({
        from: t.from,
        to: t.to,
        contractAddress: t.contractAddress,
        value: t.value,
        timeStamp: t.timeStamp,
        hash: t.hash,
      }))

      const result = await verifyProofAction({
        id: proofId,
        nullifier: derivedNullifier,
        transfers: verifyTransfers,
      })

      if (result?.serverError) {
        throw new Error(result.serverError)
      }

      if (result?.data?.isValid) {
        toast.success('Proof verified successfully!')
        setProof(prev => ({
          ...prev,
          verificationStats: {
            successful: (prev.verificationStats?.successful ?? 0) + 1,
            failed: prev.verificationStats?.failed ?? 0,
          },
        }))
      } else {
        toast.error(result?.data?.error || 'Proof verification failed')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify proof')
    } finally {
      setVerifying(false)
    }
  }, [walletAddress, walletClient, claim, claimId, proofId, proof.nullifier, allTransfers])

  const fetchTransfersForVerification = useCallback(async () => {
    setFetchingTransfers(true)
    try {
      const res = await api.api.claims[':id'].transfers.$get({
        param: { id: claimId },
      })
      if (!res.ok) throw new Error('Failed to fetch transfers')
      const data = await res.json()
      setTransfers(data as EtherscanTransfer[])
    } catch (error) {
      console.error('fetchTransfersForVerification:', error)
      toast.error('Failed to fetch transfers')
    } finally {
      setFetchingTransfers(false)
    }
  }, [claimId])

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
  }, [csvFiles.length, claim.tokenAddress, claim.token?.decimals])

  const handleRemoveCsv = useCallback((index: number) => {
    setCsvFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const alreadyVerified = !!proof.verificationStats?.successful

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
          verifying={verifying}
          fetchingTransfers={fetchingTransfers}
          isConnected={isConnected}
          alreadyVerified={alreadyVerified}
          hasTransfers={!!allTransfers.length}
          onVerify={handleVerify}
          onConnectWallet={() => open()}
          onFetchTransfers={fetchTransfersForVerification}
          onCsvUpload={handleCsvUpload}
          onRemoveCsv={handleRemoveCsv}
        />
      </div>
    </>
  )
}
