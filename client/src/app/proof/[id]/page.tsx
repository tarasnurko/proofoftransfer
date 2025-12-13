'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import type { ERC20Transfer } from '@/services/etherscan'

interface ProofData {
  id: number
  createdAt: string
  recipient: string
  tokenAddress: string
  startDate: string
  endDate: string
  minAmount: string
  maxAmount: string
  proof: string
  publicInputs: string
  globalTransfersRoot: string
  addressCommitment: string
  messageHash: string
  message: string | null
}

export default function ProofPage() {
  const params = useParams()
  const proofId = params.id as string

  const [proofData, setProofData] = useState<ProofData | null>(null)
  const [transfers, setTransfers] = useState<ERC20Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingTransfers, setFetchingTransfers] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch proof data
  useEffect(() => {
    const fetchProof = async () => {
      try {
        const response = await axios.get(`/api/proofs?id=${proofId}`)
        setProofData(response.data.proof)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch proof')
      } finally {
        setLoading(false)
      }
    }

    fetchProof()
  }, [proofId])

  const handleFetchTransfers = async () => {
    if (!proofData) return

    setFetchingTransfers(true)
    try {
      // Convert dates to block numbers
      const startTimestamp = Math.floor(new Date(proofData.startDate).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(proofData.endDate).getTime() / 1000)

      const [fromBlockRes, toBlockRes] = await Promise.all([
        axios.get('/api/block-number', {
          params: { timestamp: startTimestamp.toString(), closest: 'after' },
        }),
        axios.get('/api/block-number', {
          params: { timestamp: endTimestamp.toString(), closest: 'before' },
        }),
      ])

      // Fetch all transfers to recipient
      const response = await axios.get('/api/transfers', {
        params: {
          address: proofData.recipient,
          startblock: fromBlockRes.data.blockNumber,
          endblock: toBlockRes.data.blockNumber,
        },
      })

      // Filter by token address and recipient
      const filteredTransfers = response.data.transfers.filter(
        (t: ERC20Transfer) => {
          const matchesToken = t.contractAddress.toLowerCase() === proofData.tokenAddress.toLowerCase()
          const matchesRecipient = t.to.toLowerCase() === proofData.recipient.toLowerCase()
          return matchesToken && matchesRecipient
        }
      )

      console.log('Total transfers:', response.data.transfers.length)
      console.log('Filtered transfers:', filteredTransfers.length)
      console.log('Token address filter:', proofData.tokenAddress)

      setTransfers(filteredTransfers)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch transfers')
    } finally {
      setFetchingTransfers(false)
    }
  }

  const handleVerifyProof = async () => {
    if (!proofData) return

    setVerifying(true)
    setVerificationResult(null)

    try {
      // Calculate total amount from transfers
      const totalAmount = transfers.reduce((sum, transfer) => {
        return sum + BigInt(transfer.value)
      }, BigInt(0))

      const minAmount = BigInt(proofData.minAmount)
      const maxAmount = BigInt(proofData.maxAmount)

      // Check if total is within range
      if (totalAmount >= minAmount && totalAmount <= maxAmount) {
        setVerificationResult(
          `✅ Proof verified! Total transfers: ${totalAmount.toString()} (within range ${minAmount.toString()} - ${maxAmount.toString()})`
        )
      } else {
        setVerificationResult(
          `❌ Verification failed! Total ${totalAmount.toString()} is outside range ${minAmount.toString()} - ${maxAmount.toString()}`
        )
      }

      // Note: This is a simplified verification
      // Full ZK proof verification would require:
      // 1. Verifying the actual cryptographic proof
      // 2. Checking Merkle tree inclusions
      // 3. Verifying the ECDSA signature
    } catch (err: any) {
      setError(err.message || 'Failed to verify proof')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Loading proof...</h2>
        </div>
      </div>
    )
  }

  if (error && !proofData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!proofData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Proof not found</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Proof #{proofId}</h1>
        <p className="text-muted-foreground">
          Verify zero-knowledge proof of transfer
        </p>
      </div>

      {/* Proof Details */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Proof Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Created:</span>
            <p className="font-mono mt-1">
              {new Date(proofData.createdAt).toLocaleString()}
            </p>
          </div>

          <div>
            <span className="text-muted-foreground">Recipient:</span>
            <p className="font-mono mt-1 break-all">{proofData.recipient}</p>
          </div>

          <div>
            <span className="text-muted-foreground">Token Address:</span>
            <p className="font-mono mt-1 break-all">{proofData.tokenAddress}</p>
          </div>

          <div>
            <span className="text-muted-foreground">Date Range:</span>
            <p className="font-mono mt-1">
              {new Date(proofData.startDate).toLocaleDateString()} -{' '}
              {new Date(proofData.endDate).toLocaleDateString()}
            </p>
          </div>

          <div>
            <span className="text-muted-foreground">Amount Range:</span>
            <p className="font-mono mt-1">
              {proofData.minAmount} - {proofData.maxAmount}
            </p>
          </div>

          <div>
            <span className="text-muted-foreground">Address Commitment:</span>
            <p className="font-mono mt-1 break-all text-xs">
              {proofData.addressCommitment}
            </p>
          </div>
        </div>

        {proofData.message && (
          <div>
            <span className="text-muted-foreground">Message:</span>
            <p className="mt-1 p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
              {proofData.message}
            </p>
          </div>
        )}

        <div className="pt-4">
          <Button
            onClick={handleFetchTransfers}
            disabled={fetchingTransfers}
            className="w-full"
          >
            {fetchingTransfers ? 'Fetching Transfers...' : 'Fetch Transfers'}
          </Button>
        </div>
      </div>

      {/* Transfers */}
      {transfers.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Transfers Found: {transfers.length}
            </h2>
            <Button
              onClick={handleVerifyProof}
              disabled={verifying}
              variant="default"
            >
              {verifying ? 'Verifying...' : 'Verify Proof'}
            </Button>
          </div>

          {verificationResult && (
            <div
              className={`p-4 rounded-lg ${
                verificationResult.includes('✅')
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              <p
                className={
                  verificationResult.includes('✅')
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }
              >
                {verificationResult}
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {transfers.map((transfer, index) => (
              <div
                key={`${transfer.hash}-${index}`}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-semibold">
                    {transfer.tokenSymbol}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(
                      parseInt(transfer.timeStamp) * 1000
                    ).toLocaleDateString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Amount:</span>{' '}
                    <span className="font-mono">
                      {(
                        parseInt(transfer.value) /
                        10 ** parseInt(transfer.tokenDecimal)
                      ).toFixed(4)}{' '}
                      {transfer.tokenSymbol}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground">Block:</span>{' '}
                    <span className="font-mono">{transfer.blockNumber}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-muted-foreground">From:</span>{' '}
                    <span className="font-mono">{transfer.from}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tx:</span>{' '}
                    <span className="font-mono">{transfer.hash}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  )
}
