'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useAccount, useWalletClient } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { PageContainer } from '@/components/layout/page-container'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimInfoCard, TransfersCard, GenerateProofCard, ProofsCard } from '@/components/features/claim-details'
import type { ClaimEntity, EtherscanTransfer, ProofEntity } from '@/lib/types'
import { toast } from 'sonner'
import { assembleCircuitInputs, generateProofFromPrepared } from '@/lib/proof-generator'
import type { PreparedProofData, ServerSigningData } from '@/lib/proof-generator'
import { submitProofAction, prepareClaimSigningDataAction, processSignatureAction } from '@/actions/proofs.actions'

const PROOFS_PER_PAGE = 9

export default function ClaimDetailsPage() {
  const params = useParams()
  const claimId = params.id as string
  const { address: walletAddress, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { open } = useAppKit()

  const [claim, setClaim] = useState<ClaimEntity | null>(null)
  const [proofs, setProofs] = useState<ProofEntity[]>([])
  const [transfers, setTransfers] = useState<EtherscanTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnlyMyTransfers, setShowOnlyMyTransfers] = useState(false)
  const [preparedProof, setPreparedProof] = useState<PreparedProofData | null>(null)
  const [signingClaim, setSigningClaim] = useState(false)
  const [generatingProof, setGeneratingProof] = useState(false)

  const [proofSearchQuery, setProofSearchQuery] = useState('')
  const [proofSortBy, setProofSortBy] = useState('createdAt-desc')
  const [proofPage, setProofPage] = useState(1)

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [claimRes, proofsRes, transfersRes] = await Promise.all([
        fetch(`/api/claims/${claimId}`),
        fetch(`/api/claims/${claimId}/proofs`),
        fetch(`/api/claims/${claimId}/transfers`),
      ])

      if (!claimRes.ok) throw new Error('Claim not found')
      setClaim(await claimRes.json())

      if (proofsRes.ok) setProofs(await proofsRes.json())
      if (transfersRes.ok) setTransfers(await transfersRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [claimId])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  const fetchProofs = useCallback(async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/proofs`)
      if (response.ok) setProofs(await response.json())
    } catch {}
  }, [claimId])

  const displayedTransfers = useMemo(() => {
    if (!showOnlyMyTransfers || !walletAddress) return transfers
    return transfers.filter(t => t.from.toLowerCase() === walletAddress.toLowerCase())
  }, [transfers, showOnlyMyTransfers, walletAddress])

  const userTransferCount = useMemo(() => {
    if (!walletAddress) return 0
    return transfers.filter(t => t.from.toLowerCase() === walletAddress.toLowerCase()).length
  }, [transfers, walletAddress])

  const nullifierAlreadyUsed = useMemo(() => {
    if (!preparedProof) return false
    return proofs.some(p => p.nullifier === preparedProof.nullifier)
  }, [preparedProof, proofs])

  const handleSignClaim = useCallback(async () => {
    if (!walletAddress || !walletClient || !claim) return

    setSigningClaim(true)
    try {
      const result = await prepareClaimSigningDataAction({ claimId, proverAddress: walletAddress })
      if (result?.serverError) throw new Error(result.serverError)
      if (!result?.data) throw new Error('Failed to prepare signing data')

      const serverData = result.data as ServerSigningData
      const walletChainId = await walletClient.getChainId()

      const claimTypes = {
        Claim: [
          { name: 'claimId', type: 'bytes32' },
          { name: 'claimMessageHash', type: 'bytes32' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'recipientAddress', type: 'address' },
          { name: 'minTransfersSum', type: 'uint128' },
          { name: 'maxTransfersSum', type: 'uint128' },
          { name: 'fromBlockTimestamp', type: 'uint64' },
          { name: 'toBlockTimestamp', type: 'uint64' },
          { name: 'transfersRootHash', type: 'bytes32' },
        ],
      } as const

      const domain = {
        name: 'ProofOfTransfer',
        version: '1',
        chainId: BigInt(walletChainId),
        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      }

      const message = {
        claimId: serverData.eip712.claimIdBytes32,
        claimMessageHash: serverData.eip712.claimMessageHashBytes32,
        tokenAddress: serverData.eip712.tokenAddress as `0x${string}`,
        recipientAddress: serverData.eip712.recipientAddress as `0x${string}`,
        minTransfersSum: BigInt(serverData.eip712.minTransfersSum),
        maxTransfersSum: BigInt(serverData.eip712.maxTransfersSum),
        fromBlockTimestamp: BigInt(serverData.eip712.fromBlockTimestamp),
        toBlockTimestamp: BigInt(serverData.eip712.toBlockTimestamp),
        transfersRootHash: serverData.eip712.merkleTreeRootBytes32,
      }

      const signature = await walletClient.signTypedData({
        account: walletClient.account!,
        domain,
        types: claimTypes,
        primaryType: 'Claim',
        message,
      })

      const sigResult = await processSignatureAction({ signature })
      if (sigResult?.serverError) throw new Error(sigResult.serverError)
      if (!sigResult?.data) throw new Error('Failed to process signature')

      const { recoverPublicKey, hashTypedData, keccak256, hexToBytes } = await import('viem')

      const hashToRecover = hashTypedData({
        domain,
        types: claimTypes,
        primaryType: 'Claim',
        message,
      })

      const publicKey = await recoverPublicKey({ hash: hashToRecover, signature })

      const pkBytes = hexToBytes(publicKey)
      const pkHash = keccak256(pkBytes.slice(1))
      const derivedAddress = '0x' + pkHash.slice(-40)
      if (derivedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error('Public key does not match prover address')
      }

      const prepared = assembleCircuitInputs(
        serverData,
        sigResult.data,
        walletChainId,
        { pubKeyX: Array.from(pkBytes.slice(1, 33)), pubKeyY: Array.from(pkBytes.slice(33, 65)) },
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
        transfersRootHash: generated.transfersRootHash,
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
      await fetchProofs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate proof')
    } finally {
      setGeneratingProof(false)
    }
  }, [preparedProof, claimId, fetchProofs])

  const filteredAndSortedProofs = useMemo(() => {
    let filtered = [...proofs]

    if (proofSearchQuery) {
      const query = proofSearchQuery.toLowerCase()
      filtered = filtered.filter(
        (proof) =>
          proof.nullifier.toLowerCase().includes(query) ||
          proof.id.toLowerCase().includes(query)
      )
    }

    const [, sortOrder] = proofSortBy.split('-')
    filtered.sort((a, b) => {
      const aVal = new Date(a.createdAt).getTime()
      const bVal = new Date(b.createdAt).getTime()
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

    return filtered
  }, [proofs, proofSearchQuery, proofSortBy])

  const totalProofPages = Math.ceil(filteredAndSortedProofs.length / PROOFS_PER_PAGE)
  const paginatedProofs = filteredAndSortedProofs.slice(
    (proofPage - 1) * PROOFS_PER_PAGE,
    proofPage * PROOFS_PER_PAGE
  )

  useEffect(() => {
    setProofPage(1)
  }, [proofSearchQuery, proofSortBy])

  if (loading) return <PageContainer><LoadingState message="Loading claim details..." /></PageContainer>
  if (error) return <PageContainer><ErrorState message={error} /></PageContainer>
  if (!claim) return <PageContainer><ErrorState message="Claim not found" /></PageContainer>

  return (
    <PageContainer>
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
          chainId={claim.chainId}
          isConnected={isConnected}
          walletAddress={walletAddress}
          preparedProof={preparedProof}
          nullifierAlreadyUsed={nullifierAlreadyUsed}
          userTransferCount={userTransferCount}
          signingClaim={signingClaim}
          generatingProof={generatingProof}
          onConnect={() => open()}
          onSignClaim={handleSignClaim}
          onGenerateProof={handleGenerateProof}
        />

        <ProofsCard
          claimId={claimId}
          proofs={proofs}
          filteredCount={filteredAndSortedProofs.length}
          paginatedProofs={paginatedProofs}
          preparedProof={preparedProof}
          searchQuery={proofSearchQuery}
          sortBy={proofSortBy}
          currentPage={proofPage}
          totalPages={totalProofPages}
          onSearchChange={setProofSearchQuery}
          onSortChange={setProofSortBy}
          onPageChange={setProofPage}
        />
      </div>
    </PageContainer>
  )
}
