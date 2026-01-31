'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import AppHeader from '@/components/app-header'
import { getClaimByIdAction } from '@/actions/claims'
import { fetchTransfersAction, submitProofAction } from '@/actions/proofs'
import { format } from 'date-fns'
import type { EtherscanERC20Transfer } from '@repo/types'
import { useAccount, useWalletClient } from 'wagmi'
import { generateClaimProof } from '@/lib/proof-generator'
import { verifyProofClient, hexToUint8Array } from '@/lib/proof-verifier'

type Claim = {
  id: string
  message: string
  message_hash: string
  token_address: string
  recipient_address: string
  min_transfers_sum: string
  max_transfers_sum: string
  from_block_timestamp: number
  to_block_timestamp: number
  chain_id: number
  creator_address: string
  created_at: string
  proofCount: number
}

type TransferFilter = 'all' | 'mine' | 'highlighted'

function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return 'No limit'
  return format(new Date(timestamp * 1000), 'MMM d, yyyy')
}

export default function GenerateProofPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const claimId = searchParams.get('claim')
  const { address: walletAddress } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [claim, setClaim] = useState<Claim | null>(null)
  const [loading, setLoading] = useState(true)
  const [proverAddress, setProverAddress] = useState('')
  const [allTransfers, setAllTransfers] = useState<EtherscanERC20Transfer[]>([])
  const [transferFilter, setTransferFilter] = useState<TransferFilter>('highlighted')
  const [isFetchingTransfers, setIsFetchingTransfers] = useState(false)
  const [isGeneratingProof, setIsGeneratingProof] = useState(false)
  const [proof, setProof] = useState<string | null>(null)
  const [nullifier, setNullifier] = useState<string | null>(null)
  const [transfersRootHash, setTransfersRootHash] = useState<string | null>(null)
  const [proofPublicInputs, setProofPublicInputs] = useState<any>(null)

  // Load claim data
  useEffect(() => {
    async function loadClaim() {
      if (!claimId) {
        toast.error('No claim ID provided')
        router.push('/')
        return
      }

      try {
        const result = await getClaimByIdAction(claimId)
        if (result.success && result.data) {
          setClaim(result.data)
        } else {
          toast.error('Claim not found')
          router.push('/')
        }
      } catch (error) {
        toast.error('Failed to load claim')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    loadClaim()
  }, [claimId, router])

  const handleFetchTransfers = async () => {
    if (!claim) return

    setIsFetchingTransfers(true)
    try {
      const result = await fetchTransfersAction(claim.id)

      if (result.success && result.transfers) {
        setAllTransfers(result.transfers)
        toast.success(`Found ${result.transfers.length} matching transfers`)
      } else {
        toast.error(result.error || 'Failed to fetch transfers')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch transfers')
    } finally {
      setIsFetchingTransfers(false)
    }
  }

  const getProverAddress = () => proverAddress || walletAddress || ''

  const getFilteredTransfers = () => {
    const prover = getProverAddress()

    switch (transferFilter) {
      case 'mine':
        return allTransfers.filter((t) => t.from.toLowerCase() === prover.toLowerCase())
      case 'all':
        return allTransfers
      case 'highlighted':
      default:
        return allTransfers
    }
  }

  const isProverTransfer = (transfer: EtherscanERC20Transfer) => {
    const prover = getProverAddress()
    return transfer.from.toLowerCase() === prover.toLowerCase()
  }

  const myTransfers = allTransfers.filter(isProverTransfer)
  const myTransfersCount = myTransfers.length

  const handleGenerateProof = async () => {
    if (!claim) return

    if (myTransfersCount === 0) {
      toast.error('No transfers found for your address')
      return
    }

    if (!walletClient) {
      toast.error('Please connect your wallet')
      return
    }

    const prover = getProverAddress()
    if (!prover) {
      toast.error('No prover address available')
      return
    }

    setIsGeneratingProof(true)

    try {
      toast.info('Generating ZK proof... This may take 30-60 seconds.')

      // Generate real circuit proof
      const result = await generateClaimProof({
        claimId: claim.id,
        claimMessage: claim.message,
        tokenAddress: claim.token_address,
        recipientAddress: claim.recipient_address,
        minTransfersSum: claim.min_transfers_sum,
        maxTransfersSum: claim.max_transfers_sum,
        fromBlockTimestamp: claim.from_block_timestamp,
        toBlockTimestamp: claim.to_block_timestamp,
        allTransfers: allTransfers,
        proverAddress: prover,
        walletClient: walletClient,
      })

      // Verify the proof before accepting it
      toast.info('Verifying proof...')

      const proofBytes = hexToUint8Array(result.proofData)
      const publicInputsArray = [
        result.publicInputs.claim_id,
        result.publicInputs.token_address,
        result.publicInputs.recipient_address,
        result.publicInputs.transfers_count.toString(),
      ]

      const isValid = await verifyProofClient(proofBytes, publicInputsArray)

      if (!isValid) {
        toast.error('Proof verification failed! Please try again.')
        return
      }

      setProof(result.proofData)
      setNullifier(result.nullifier)
      setTransfersRootHash(result.transfersRootHash)
      setProofPublicInputs(result.publicInputs)

      toast.success('ZK proof generated and verified successfully!')
    } catch (error: any) {
      console.error('Proof generation error:', error)
      toast.error(error.message || 'Failed to generate proof')
    } finally {
      setIsGeneratingProof(false)
    }
  }

  const handleSubmitProof = async () => {
    if (!proof || !nullifier || !claim || !transfersRootHash || !proofPublicInputs) return

    try {
      const result = await submitProofAction({
        claimId: claim.id,
        nullifier: nullifier,
        proofData: proof,
        publicInputs: proofPublicInputs,
        transfersRootHash: transfersRootHash,
        proverAddress: getProverAddress() || undefined,
      })

      if (result.success) {
        toast.success('Proof submitted successfully!')
        router.push(`/claims/${claim.id}`)
      } else {
        toast.error(result.error || 'Failed to submit proof')
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent" />
      </div>
    )
  }

  if (!claim) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 border-l-8 border-accent pl-6">
            <h2 className="text-5xl font-bold uppercase leading-tight text-foreground">
              GENERATE PROOF
            </h2>
          </div>

          <div className="space-y-8">
            {/* Claim Details */}
            <div className="border-4 border-foreground bg-background p-6">
              <div className="mb-6 border-b-2 border-foreground pb-2">
                <h3 className="text-xl font-bold uppercase text-foreground">CLAIM DETAILS</h3>
              </div>
              <div className="space-y-4 font-mono text-sm">
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">
                    Message
                  </div>
                  <div className="mt-1 text-foreground">{claim.message}</div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Token
                    </div>
                    <div className="mt-1 break-all text-foreground">
                      {formatAddress(claim.token_address)}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Recipient
                    </div>
                    <div className="mt-1 break-all text-foreground">
                      {formatAddress(claim.recipient_address)}
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Amount Range
                    </div>
                    <div className="mt-1 text-foreground">
                      {claim.min_transfers_sum === '0' ? 'No min' : claim.min_transfers_sum} -{' '}
                      {claim.max_transfers_sum === '0' ? 'No max' : claim.max_transfers_sum}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      Time Range
                    </div>
                    <div className="mt-1 text-foreground">
                      {formatTimestamp(claim.from_block_timestamp)} →{' '}
                      {formatTimestamp(claim.to_block_timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Prover Address Input */}
            <div className="border-4 border-foreground bg-background p-6">
              <div className="mb-6 border-b-2 border-foreground pb-2">
                <h3 className="text-xl font-bold uppercase text-foreground">PROVER SETUP</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="proverAddress" className="text-sm font-bold uppercase tracking-wide">
                    Prover Address (Optional)
                  </Label>
                  <Input
                    id="proverAddress"
                    type="text"
                    placeholder="0x... (leave empty to use connected wallet)"
                    value={proverAddress}
                    onChange={(e) => setProverAddress(e.target.value)}
                    className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
                  />
                  {walletAddress && (
                    <p className="text-sm text-muted-foreground">
                      Connected wallet: {formatAddress(walletAddress)}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleFetchTransfers}
                  disabled={isFetchingTransfers}
                  className="w-full border-2 border-foreground bg-accent px-8 py-6 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background disabled:opacity-50"
                >
                  {isFetchingTransfers ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      Fetch Transfers <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Transfers List */}
            {allTransfers.length > 0 && (
              <div className="border-4 border-foreground bg-background p-6">
                <div className="mb-6 space-y-4 border-b-2 border-foreground pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold uppercase text-foreground">
                      MATCHING TRANSFERS ({allTransfers.length})
                    </h3>
                    <div className="text-sm font-bold uppercase text-accent">
                      YOUR TRANSFERS: {myTransfersCount}
                    </div>
                  </div>

                  {/* Filter Buttons */}
                  <div className="flex gap-2">
                    {(['highlighted', 'mine', 'all'] as TransferFilter[]).map((filter) => (
                      <Button
                        key={filter}
                        onClick={() => setTransferFilter(filter)}
                        className={`border-2 border-foreground px-4 py-2 text-xs font-bold uppercase ${
                          transferFilter === filter
                            ? 'bg-foreground text-background'
                            : 'bg-background hover:bg-foreground hover:text-background'
                        }`}
                      >
                        {filter === 'highlighted' ? 'All (Highlight Mine)' : filter === 'mine' ? 'Only Mine' : 'All'}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mb-6 max-h-96 space-y-3 overflow-auto">
                  {getFilteredTransfers().map((transfer, index) => {
                    const isMine = isProverTransfer(transfer)
                    const shouldHighlight = transferFilter === 'highlighted' && isMine

                    return (
                      <div
                        key={index}
                        className={`border-2 p-4 font-mono text-sm ${
                          shouldHighlight
                            ? 'border-accent bg-accent/10'
                            : isMine && transferFilter === 'all'
                            ? 'border-accent bg-accent/5'
                            : 'border-foreground bg-background'
                        } ${!isMine && transferFilter === 'highlighted' ? 'opacity-40' : ''}`}
                      >
                        <div className="grid gap-3 md:grid-cols-4">
                          <div>
                            <div className="font-bold uppercase text-muted-foreground">From</div>
                            <div className="mt-1 text-foreground">
                              {formatAddress(transfer.from)}
                              {isMine && <span className="ml-2 text-accent">(YOU)</span>}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold uppercase text-muted-foreground">Amount</div>
                            <div className="mt-1 text-foreground">{transfer.value}</div>
                          </div>
                          <div>
                            <div className="font-bold uppercase text-muted-foreground">Date</div>
                            <div className="mt-1 text-foreground">
                              {format(new Date(Number(transfer.timeStamp) * 1000), 'MMM d, yyyy')}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold uppercase text-muted-foreground">TX Hash</div>
                            <div className="mt-1 text-foreground">{formatAddress(transfer.hash)}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Button
                  onClick={handleGenerateProof}
                  disabled={isGeneratingProof || myTransfersCount === 0}
                  className="w-full border-2 border-foreground bg-foreground px-8 py-6 font-bold uppercase text-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  {isGeneratingProof ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Proof...
                    </>
                  ) : (
                    <>
                      Generate ZK Proof ({myTransfersCount} Transfers){' '}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Generated Proof */}
            {proof && (
              <div className="border-4 border-accent bg-background p-6">
                <div className="mb-6 border-b-2 border-accent pb-2">
                  <h3 className="text-xl font-bold uppercase text-accent">PROOF GENERATED</h3>
                </div>

                <div className="mb-4 space-y-4">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      ZK Proof Hash
                    </div>
                    <div className="mt-2 break-all border-2 border-accent bg-background p-4 font-mono text-sm text-foreground">
                      {proof}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmitProof}
                  className="w-full border-2 border-accent bg-accent px-8 py-6 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background"
                >
                  Submit Proof
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
