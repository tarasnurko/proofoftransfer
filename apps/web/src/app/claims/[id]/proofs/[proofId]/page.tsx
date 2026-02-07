'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { parseUnits } from 'viem'
import { useAccount, useWalletClient } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { PageContainer } from '@/components/layout/page-container'
import { LoadingState } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimSummaryCard, ProofInfoCard, VerifyProofCard } from '@/components/features/proof-details'
import type { ClaimEntity, ProofEntity, EtherscanTransfer } from '@/lib/types'
import { toast } from 'sonner'
import { verifyProofAction, prepareVerificationSigningDataAction, processSignatureAction } from '@/actions/proofs.actions'

export default function ProofDetailsPage() {
  const params = useParams()
  const claimId = params.id as string
  const proofId = params.proofId as string

  const { address: walletAddress, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { open } = useAppKit()

  const [claim, setClaim] = useState<ClaimEntity | null>(null)
  const [proof, setProof] = useState<ProofEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [transfers, setTransfers] = useState<EtherscanTransfer[]>([])
  const [fetchingTransfers, setFetchingTransfers] = useState(false)
  const [csvFiles, setCsvFiles] = useState<Array<{ name: string; transfers: EtherscanTransfer[] }>>([])

  useEffect(() => {
    fetchData()
  }, [claimId, proofId])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const [claimRes, proofRes] = await Promise.all([
        fetch(`/api/claims/${claimId}`),
        fetch(`/api/proofs/${proofId}`)
      ])

      if (!claimRes.ok || !proofRes.ok) {
        throw new Error('Failed to fetch data')
      }

      const [claimData, proofData] = await Promise.all([
        claimRes.json(),
        proofRes.json()
      ])

      setClaim(claimData)
      setProof(proofData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [claimId, proofId])

  // Collect all transfers from blockchain fetch + CSV uploads
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
      // Step 1: Prepare EIP-712 signing data (no proverAddress needed)
      const prepResult = await prepareVerificationSigningDataAction({ claimId })
      if (prepResult?.serverError) throw new Error(prepResult.serverError)
      if (!prepResult?.data) throw new Error('Failed to prepare signing data')

      const serverData = prepResult.data
      const walletChainId = await walletClient.getChainId()

      // Step 2: Sign EIP-712 typed data
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

      // Step 3: Derive nullifier from signature
      const sigResult = await processSignatureAction({ signature })
      if (sigResult?.serverError) throw new Error(sigResult.serverError)
      if (!sigResult?.data) throw new Error('Failed to process signature')

      const derivedNullifier = sigResult.data.nullifier

      // Step 4: Check nullifier match — cannot verify your own proof
      if (derivedNullifier === proof?.nullifier) {
        toast.error('Cannot verify your own proof')
        return
      }

      // Step 5: Call server verify with nullifier + verifier-provided transfers
      const verifyTransfers = allTransfers.map((t) => ({
        from: t.from,
        to: t.to,
        contractAddress: t.contractAddress,
        value: t.value,
        timeStamp: t.timeStamp,
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
        await fetchData()
      } else {
        toast.error(result?.data?.error || 'Proof verification failed')
        await fetchData()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify proof')
    } finally {
      setVerifying(false)
    }
  }, [walletAddress, walletClient, claim, claimId, proofId, proof?.nullifier, allTransfers, fetchData])

  const fetchTransfersForVerification = useCallback(async () => {
    setFetchingTransfers(true)
    try {
      const response = await fetch(`/api/claims/${claimId}/transfers`)
      if (!response.ok) throw new Error('Failed to fetch transfers')
      const data = await response.json()
      setTransfers(data)
    } catch {
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
      const lines = text.split('\n').filter(line => line.trim())

      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows')
        e.target.value = ''
        return
      }

      // Validate format - check for expected headers
      const headerLine = lines[0]!.toLowerCase().replace(/["'\s]/g, '')
      const requiredHeaders = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'quantity']
      const hasValidFormat = requiredHeaders.every(header => headerLine.includes(header))

      if (!hasValidFormat) {
        toast.error('Invalid CSV format. Expected columns: Transaction Hash, Blockno, UnixTimestamp, From, To, Quantity')
        e.target.value = ''
        return
      }

      // Parse CSV with quoted values support
      const parseCsvLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]!
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
      const parsed: EtherscanTransfer[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]!)
        const row: Record<string, string> = {}
        headers.forEach((header, index) => {
          row[header] = values[index]?.replace(/^"|"$/g, '') || ''
        })

        // Convert human-readable quantity to raw token units (same as etherscan API value)
      const rawQuantity = row['quantity'] || row['value'] || row['amount'] || ''
      const tokenDecimals = claim?.token?.decimals ?? 18
      const rawValue = rawQuantity.includes('.')
          ? parseUnits(rawQuantity, tokenDecimals).toString()
          : rawQuantity

        parsed.push({
          hash: row['transactionhash'] || row['txhash'] || row['hash'] || '',
          from: row['from'] || '',
          to: row['to'] || '',
          contractAddress: claim?.tokenAddress || '',
          value: rawValue,
          timeStamp: row['unixtimestamp'] || row['timestamp'] || '',
          blockNumber: row['blockno'] || row['blocknumber'] || row['block'] || '',
        })
      }

      if (!parsed.length) {
        toast.error('No valid transfers found in CSV')
        e.target.value = ''
        return
      }

      setCsvFiles(prev => [...prev, { name: file.name, transfers: parsed }])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse CSV')
    } finally {
      e.target.value = ''
    }
  }, [csvFiles.length, claim?.tokenAddress])

  const handleRemoveCsv = useCallback((index: number) => {
    setCsvFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  if (loading) return <PageContainer><LoadingState message="Loading proof details..." /></PageContainer>
  if (error) return <PageContainer><ErrorState message={error} /></PageContainer>
  if (!claim || !proof) return <PageContainer><ErrorState message="Proof not found" /></PageContainer>

  const alreadyVerified = !!proof.verificationStats?.successful

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href={`/claims/${claimId}`} label="Back to Claim" />
        <CopyLinkButton />
      </div>

      <PageHeader title="Proof Details" />

      <div className="space-y-6">
        <ClaimSummaryCard claim={claim} />
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
    </PageContainer>
  )
}
