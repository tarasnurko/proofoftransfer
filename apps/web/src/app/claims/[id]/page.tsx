'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAccount, useWalletClient } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { EmptyState } from '@/components/shared/empty-state'
import { Address } from '@/components/shared/address'
import { CopyHash } from '@/components/shared/copy-hash'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
import type { ClaimEntity, EtherscanTransfer, ProofEntity } from '@/lib/types'
import { getChainName } from '@/lib/types'
import { ChainBadge } from '@/components/shared/chain-badge'
import { formatTokenAmount } from '@/lib/address-utils'
import { ArrowLeft, Check, Loader2, Search, ChevronLeft, ChevronRight, FileSearch, Shield, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { assembleCircuitInputs, generateProofFromPrepared } from '@/lib/proof-generator'
import type { PreparedProofData, ServerSigningData } from '@/lib/proof-generator'
import { submitProofAction, prepareClaimSigningDataAction, processSignatureAction } from '@/actions/proofs.actions'

const PROOFS_PER_PAGE = 9

export default function ClaimDetailsPage() {
  const params = useParams()
  const router = useRouter()
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

  // Proof search and pagination
  const [proofSearchQuery, setProofSearchQuery] = useState('')
  const [proofSortBy, setProofSortBy] = useState('createdAt-desc')
  const [proofPage, setProofPage] = useState(1)

  useEffect(() => {
    fetchClaimDetails()
    fetchProofs()
    fetchTransfers()
  }, [claimId])

  const fetchClaimDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/claims/${claimId}`)
      if (!response.ok) throw new Error('Claim not found')
      const data = await response.json()
      setClaim(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchProofs = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/proofs`)
      if (response.ok) {
        const data = await response.json()
        setProofs(data)
      }
    } catch (err) {
      console.error('Failed to fetch proofs:', err)
    }
  }

  const fetchTransfers = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/transfers`)
      if (response.ok) {
        const data = await response.json()
        setTransfers(data)
      }
    } catch (error) {
      console.error('Failed to fetch transfers:', error)
    }
  }

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

  const handleSignClaim = async () => {
    if (!walletAddress || !walletClient || !claim) return

    setSigningClaim(true)
    try {
      // 1. Server prepares merkle tree + EIP-712 fields (fast, no WASM on client)
      const result = await prepareClaimSigningDataAction({ claimId, proverAddress: walletAddress })
      if (result?.serverError) throw new Error(result.serverError)
      if (!result?.data) throw new Error('Failed to prepare signing data')

      const serverData = result.data as ServerSigningData
      const walletChainId = await walletClient.getChainId()

      // 2. Sign EIP-712 typed data (MetaMask popup — appears fast now)
      const signature = await walletClient.signTypedData({
        account: walletClient.account!,
        domain: {
          name: 'ProofOfTransfer',
          version: '1',
          chainId: BigInt(walletChainId),
          verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        },
        types: {
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
        } as const,
        primaryType: 'Claim',
        message: {
          claimId: serverData.eip712.claimIdBytes32,
          claimMessageHash: serverData.eip712.claimMessageHashBytes32,
          tokenAddress: serverData.eip712.tokenAddress as `0x${string}`,
          recipientAddress: serverData.eip712.recipientAddress as `0x${string}`,
          minTransfersSum: BigInt(serverData.eip712.minTransfersSum),
          maxTransfersSum: BigInt(serverData.eip712.maxTransfersSum),
          fromBlockTimestamp: BigInt(serverData.eip712.fromBlockTimestamp),
          toBlockTimestamp: BigInt(serverData.eip712.toBlockTimestamp),
          transfersRootHash: serverData.eip712.merkleTreeRootBytes32,
        },
      })

      // 3. Server computes nullifier from signature (Poseidon2, no WASM on client)
      const sigResult = await processSignatureAction({ signature })
      if (sigResult?.serverError) throw new Error(sigResult.serverError)
      if (!sigResult?.data) throw new Error('Failed to process signature')

      // 4. Recover public key client-side (lightweight, no WASM)
      const { recoverPublicKey, hashTypedData, keccak256, hexToBytes } = await import('viem')

      const hashToRecover = hashTypedData({
        domain: {
          name: 'ProofOfTransfer',
          version: '1',
          chainId: BigInt(walletChainId),
          verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        },
        types: {
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
        } as const,
        primaryType: 'Claim',
        message: {
          claimId: serverData.eip712.claimIdBytes32,
          claimMessageHash: serverData.eip712.claimMessageHashBytes32,
          tokenAddress: serverData.eip712.tokenAddress as `0x${string}`,
          recipientAddress: serverData.eip712.recipientAddress as `0x${string}`,
          minTransfersSum: BigInt(serverData.eip712.minTransfersSum),
          maxTransfersSum: BigInt(serverData.eip712.maxTransfersSum),
          fromBlockTimestamp: BigInt(serverData.eip712.fromBlockTimestamp),
          toBlockTimestamp: BigInt(serverData.eip712.toBlockTimestamp),
          transfersRootHash: serverData.eip712.merkleTreeRootBytes32,
        },
      })

      const publicKey = await recoverPublicKey({ hash: hashToRecover, signature })

      // Verify public key matches prover address
      const pkBytes = hexToBytes(publicKey)
      const pkHash = keccak256(pkBytes.slice(1))
      const derivedAddress = '0x' + pkHash.slice(-40)
      if (derivedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new Error('Public key does not match prover address')
      }

      const pubKeyX = Array.from(pkBytes.slice(1, 33))
      const pubKeyY = Array.from(pkBytes.slice(33, 65))

      // 5. Assemble circuit inputs
      const prepared = assembleCircuitInputs(
        serverData,
        sigResult.data,
        walletChainId,
        { pubKeyX, pubKeyY },
      )

      setPreparedProof(prepared)
      toast.success('Claim signed successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign claim')
      console.error(err)
    } finally {
      setSigningClaim(false)
    }
  }

  const handleGenerateProof = async () => {
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
      console.error('Proof generation failed:', err)
    } finally {
      setGeneratingProof(false)
    }
  }

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

    const [sortField, sortOrder] = proofSortBy.split('-')
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
        <Link href="/" className="inline-flex items-center text-sm hover:opacity-80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Claims
        </Link>
        <CopyLinkButton />
      </div>

      <div className="mb-8 space-y-2 border-b-4 border-border pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-balance text-4xl font-bold uppercase tracking-tight">Claim Details</h1>
          {claim.proofCount > 0 && (
            <Badge className="shrink-0 whitespace-nowrap border-2 text-sm font-bold">
              {claim.proofCount} Proof{claim.proofCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Claim Details Card */}
        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-bold text-muted-foreground">Message</div>
              <p className="mt-1">{claim.message}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm font-bold text-muted-foreground">Chain</div>
                <div className="mt-1"><ChainBadge chainId={claim.chainId} /></div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Token</div>
                <div className="mt-1 flex items-center gap-2">
                  {claim.token ? `${claim.token.name} (${claim.token.symbol})` : 'Unknown'}
                  <Address address={claim.tokenAddress} chainId={claim.chainId} chars={6} />
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Recipient</div>
                <div className="mt-1">
                  <Address address={claim.recipientAddress} chainId={claim.chainId} />
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Created</div>
                <div className="mt-1">{new Date(claim.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {claim.merkleRoot && (
              <div>
                <div className="text-sm font-bold text-muted-foreground">Merkle Root</div>
                <div className="mt-1 flex items-center gap-2">
                  <CopyHash hash={claim.merkleRoot} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transfers Section */}
        <Card className="border-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">Transfers</CardTitle>
                <CardDescription>
                  {transfers.length} transfer{transfers.length !== 1 ? 's' : ''} matching this claim
                </CardDescription>
              </div>
              {isConnected && userTransferCount > 0 && (
                <Button
                  variant={showOnlyMyTransfers ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowOnlyMyTransfers(!showOnlyMyTransfers)}
                  className="border-2 font-bold"
                >
                  {showOnlyMyTransfers ? 'Show All' : `My Transfers (${userTransferCount})`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {displayedTransfers.length === 0 ? (
              <EmptyState
                icon={<FileSearch className="h-12 w-12" />}
                title="No Transfers"
                message={showOnlyMyTransfers ? "You don't have any transfers" : "No transfers found"}
              />
            ) : (
              <VirtualTransferList
                transfers={displayedTransfers.map((t) => ({
                  from: t.from,
                  amount: t.value,
                  timestamp: parseInt(t.timeStamp),
                }))}
                token={claim.token}
                walletAddress={walletAddress}
                chainId={claim.chainId}
                maxHeight={400}
              />
            )}
          </CardContent>
        </Card>

        {/* Generate Proof Section */}
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
                  <Address address={walletAddress!} chainId={claim.chainId} />
                </div>

                {userTransferCount > 0 ? (
                  <div className="border-4 border-dashed border-border p-6 text-center">
                    <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-bold">Sign Claim</h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Sign the EIP-712 claim message to generate your unique nullifier
                    </p>
                    <Button onClick={handleSignClaim} disabled={signingClaim} className="border-4 font-bold">
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
                  <Address address={walletAddress!} chainId={claim.chainId} />
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
                        onClick={handleGenerateProof}
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

        {/* Proofs Section */}
        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Submitted Proofs</CardTitle>
            <CardDescription>
              {filteredAndSortedProofs.length} proof{filteredAndSortedProofs.length !== 1 ? 's' : ''} submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            {proofs.length > 0 && (
              <div className="mb-4 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by nullifier or ID..."
                    value={proofSearchQuery}
                    onChange={(e) => setProofSearchQuery(e.target.value)}
                    className="border-2 pl-9"
                  />
                </div>
                <Select value={proofSortBy} onValueChange={setProofSortBy}>
                  <SelectTrigger className="w-48 border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {filteredAndSortedProofs.length === 0 ? (
              <EmptyState
                icon={<FileSearch className="h-12 w-12" />}
                title="No Proofs"
                message={proofSearchQuery ? "No proofs match your search" : "No proofs submitted yet"}
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedProofs.map((proof) => (
                    <Link
                      key={proof.id}
                      href={`/claims/${claimId}/proofs/${proof.id}`}
                      className={`block border-4 p-4 transition-colors hover:bg-muted ${preparedProof && proof.nullifier === preparedProof.nullifier ? 'border-accent bg-accent/5' : 'border-border'}`}
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground">Proof</span>
                          {preparedProof && proof.nullifier === preparedProof.nullifier && (
                            <Badge variant="outline" className="border-accent text-accent text-xs">Yours</Badge>
                          )}
                        </div>
                        {proof.verified !== undefined && (
                          <Badge variant={proof.verified ? 'default' : 'destructive'}>
                            {proof.verified ? 'Valid' : 'Invalid'}
                          </Badge>
                        )}
                      </div>
                      <div className="mb-2 font-mono text-xs">{proof.nullifier.slice(0, 20)}...</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(proof.createdAt).toLocaleDateString()}
                      </div>
                    </Link>
                  ))}
                </div>

                {totalProofPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProofPage((p) => Math.max(1, p - 1))}
                      disabled={proofPage === 1}
                      className="border-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalProofPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={proofPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setProofPage(page)}
                          className="border-2"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProofPage((p) => Math.min(totalProofPages, p + 1))}
                      disabled={proofPage === totalProofPages}
                      className="border-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
