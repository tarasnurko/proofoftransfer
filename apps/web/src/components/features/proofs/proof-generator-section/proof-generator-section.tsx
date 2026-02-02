'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/components/ui'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { fetchTransfersAction, submitProofAction } from '@/actions'
import { format } from 'date-fns'
import type { EtherscanERC20Transfer } from '@repo/types'
import { useAccount, useWalletClient } from 'wagmi'
import { generateClaimProof } from '@/lib/proof-generator'
import { verifyProofClient, hexToUint8Array } from '@/lib/proof-verifier'
import { formatAddress } from '@/utils/format'
import { LABEL_UPPERCASE } from '@/constants/styles'
import type { ClaimEntity } from '@/db/index.types'

type TransferFilter = 'all' | 'mine'

interface ProofGeneratorSectionProps {
  claim: ClaimEntity
}

export function ProofGeneratorSection({ claim }: ProofGeneratorSectionProps) {
  const router = useRouter()
  const { address: walletAddress } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [mounted, setMounted] = useState(false)
  const [allTransfers, setAllTransfers] = useState<EtherscanERC20Transfer[]>([])
  const [transferFilter, setTransferFilter] = useState<TransferFilter>('all')
  const [isGeneratingProof, setIsGeneratingProof] = useState(false)
  const [proof, setProof] = useState<string | null>(null)
  const [nullifier, setNullifier] = useState<string | null>(null)
  const [transfersRootHash, setTransfersRootHash] = useState<string | null>(null)
  const [proofPublicInputs, setProofPublicInputs] = useState<any>(null)

  const { execute: fetchTransfers, isPending: isFetchingTransfers } = useAction(fetchTransfersAction, {
    onSuccess: ({ data }) => {
      if (data?.transfers) {
        setAllTransfers(data.transfers)
        toast.success(`Found ${data.transfers.length} matching transfers`)
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to fetch transfers')
    },
  })

  const { execute: submitProof } = useAction(submitProofAction, {
    onSuccess: () => {
      toast.success('Proof submitted successfully!')
      router.refresh()
      setProof(null)
      setNullifier(null)
      setTransfersRootHash(null)
      setProofPublicInputs(null)
      setAllTransfers([])
    },
    onError: ({ error }) => {
      const fieldErrors = error.validationErrors?.fieldErrors
      const errorMsg = fieldErrors?.nullifier?.[0]
        || fieldErrors?.claimId?.[0]
        || error.serverError
        || 'Failed to submit proof'
      toast.error(errorMsg)
    },
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleFetchTransfers = () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first')
      return
    }
    fetchTransfers({ claimId: claim.id })
  }

  const getProverAddress = () => walletAddress || ''

  const getFilteredTransfers = () => {
    const prover = getProverAddress()

    if (transferFilter === 'mine') {
      return allTransfers.filter((t) => t.from.toLowerCase() === prover.toLowerCase())
    }

    return allTransfers
  }

  const isProverTransfer = (transfer: EtherscanERC20Transfer) => {
    const prover = getProverAddress()
    return transfer.from.toLowerCase() === prover.toLowerCase()
  }

  const myTransfers = allTransfers.filter(isProverTransfer)
  const myTransfersCount = myTransfers.length

  const handleGenerateProof = async () => {
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

      const result = await generateClaimProof({
        claimId: claim.id,
        claimMessage: claim.message,
        tokenAddress: claim.tokenAddress,
        recipientAddress: claim.recipientAddress,
        minTransfersSum: claim.minTransfersSum,
        maxTransfersSum: claim.maxTransfersSum,
        fromBlockTimestamp: claim.fromBlockTimestamp,
        toBlockTimestamp: claim.toBlockTimestamp,
        allTransfers: allTransfers,
        proverAddress: prover,
        walletClient: walletClient,
      })

      toast.info('Verifying proof...')

      const proofBytes = hexToUint8Array(result.proofData)
      const isValid = await verifyProofClient(proofBytes, result.publicInputs)

      if (!isValid) {
        toast.error('Proof verification failed! Please try again.')
        return
      }

      setProof(result.proofData)
      setNullifier(result.nullifier)
      setTransfersRootHash(result.transfersRootHash)
      setProofPublicInputs(result.publicInputs)

      toast.success('ZK proof generated and verified successfully!')
    } catch (error: unknown) {
      console.error('Proof generation error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate proof')
    } finally {
      setIsGeneratingProof(false)
    }
  }

  const handleSubmitProof = () => {
    if (!proof || !nullifier || !transfersRootHash || !proofPublicInputs) return

    submitProof({
      claimId: claim.id,
      nullifier: nullifier,
      proofData: proof,
      publicInputs: proofPublicInputs,
      transfersRootHash: transfersRootHash,
    })
  }

  return (
    <div className="space-y-8">
      {/* Generate Proof Section */}
      <div className="border-4 border-foreground bg-background p-6">
        <div className="mb-6 border-b-2 border-foreground pb-2">
          <h3 className="text-xl font-bold uppercase text-foreground">GENERATE PROOF</h3>
        </div>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {!mounted ? (
              'Connect your wallet to fetch transfers and generate a proof.'
            ) : walletAddress ? (
              <>
                Connected as <span className="font-mono text-foreground">{formatAddress(walletAddress)}</span>.
                Click below to fetch your transfers and generate a zero-knowledge proof.
              </>
            ) : (
              'Please connect your wallet to fetch transfers and generate a proof.'
            )}
          </p>
          <Button
            onClick={handleFetchTransfers}
            disabled={isFetchingTransfers || !walletAddress}
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
              {(['all', 'mine'] as TransferFilter[]).map((filter) => (
                <Button
                  key={filter}
                  onClick={() => setTransferFilter(filter)}
                  className={`border-2 border-foreground px-4 py-2 text-xs font-bold uppercase ${
                    transferFilter === filter
                      ? 'bg-foreground text-background'
                      : 'bg-background text-foreground hover:bg-foreground hover:text-background'
                  }`}
                >
                  {filter === 'mine' ? 'Only Mine' : 'All (Highlight Mine)'}
                </Button>
              ))}
            </div>
          </div>

          <div className="mb-6 max-h-96 space-y-3 overflow-auto">
            {getFilteredTransfers().map((transfer, index) => {
              const isMine = isProverTransfer(transfer)

              return (
                <div
                  key={index}
                  className={`border-2 p-4 font-mono text-sm ${
                    isMine
                      ? 'border-accent bg-accent/10'
                      : 'border-foreground bg-background'
                  }`}
                >
                  <div className="grid gap-3 md:grid-cols-4">
                    <div>
                      <div className={LABEL_UPPERCASE}>From</div>
                      <div className="mt-1 text-foreground">
                        {formatAddress(transfer.from)}
                        {isMine && <span className="ml-2 text-accent">(YOU)</span>}
                      </div>
                    </div>
                    <div>
                      <div className={LABEL_UPPERCASE}>Amount</div>
                      <div className="mt-1 text-foreground">{transfer.value}</div>
                    </div>
                    <div>
                      <div className={LABEL_UPPERCASE}>Date</div>
                      <div className="mt-1 text-foreground">
                        {format(new Date(Number(transfer.timeStamp) * 1000), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div>
                      <div className={LABEL_UPPERCASE}>TX Hash</div>
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
              <div className={LABEL_UPPERCASE}>
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
  )
}
