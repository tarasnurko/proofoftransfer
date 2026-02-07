'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { PageContainer } from '@/components/layout/page-container'
import { LoadingState } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimSummaryCard, ProofInfoCard, VerifyProofCard } from '@/components/features/proof-details'
import type { ClaimEntity, ProofEntity, EtherscanTransfer } from '@/lib/types'
import { toast } from 'sonner'
import { verifyProofAction } from '@/actions/proofs.actions'

export default function ProofDetailsPage() {
  const params = useParams()
  const claimId = params.id as string
  const proofId = params.proofId as string

  const [claim, setClaim] = useState<ClaimEntity | null>(null)
  const [proof, setProof] = useState<ProofEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [transfers, setTransfers] = useState<EtherscanTransfer[]>([])
  const [fetchingTransfers, setFetchingTransfers] = useState(false)
  const [csvTransfers, setCsvTransfers] = useState<EtherscanTransfer[]>([])
  const [csvFileName, setCsvFileName] = useState<string | null>(null)

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

  const handleVerify = useCallback(async () => {
    setVerifying(true)
    try {
      const result = await verifyProofAction({ id: proofId })

      if (result?.serverError) {
        throw new Error(result.serverError)
      }

      if (result?.data?.isValid) {
        toast.success('Proof verified successfully!')
      } else {
        toast.error(result?.data?.error || 'Proof verification failed')
      }

      await fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify proof')
    } finally {
      setVerifying(false)
    }
  }, [proofId, fetchData])

  const fetchTransfersForVerification = useCallback(async () => {
    setFetchingTransfers(true)
    try {
      const response = await fetch(`/api/claims/${claimId}/transfers`)
      if (!response.ok) throw new Error('Failed to fetch transfers')
      const data = await response.json()
      setTransfers(data)
      toast.success(`Fetched ${data.length} transfers`)
    } catch {
      toast.error('Failed to fetch transfers')
    } finally {
      setFetchingTransfers(false)
    }
  }, [claimId])

  const handleCsvUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFileName(file.name)
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      toast.error('CSV file is empty or has no data rows')
      return
    }

    const headers = lines[0]!.toLowerCase().split(',')
    const parsed: EtherscanTransfer[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i]!.split(',')
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim() || ''
      })

      parsed.push({
        hash: row['txhash'] || row['hash'] || '',
        from: row['from'] || '',
        to: row['to'] || '',
        contractAddress: row['contractaddress'] || row['tokenaddress'] || '',
        value: row['value'] || row['amount'] || '',
        timeStamp: row['timestamp'] || row['unixtimestamp'] || '',
        blockNumber: row['blocknumber'] || row['block'] || '',
      })
    }

    setCsvTransfers(parsed)
    toast.success(`Parsed ${parsed.length} transfers from CSV`)
  }, [])

  const handleClearCsv = useCallback(() => {
    setCsvFileName(null)
    setCsvTransfers([])
  }, [])

  if (loading) return <PageContainer><LoadingState message="Loading proof details..." /></PageContainer>
  if (error) return <PageContainer><ErrorState message={error} /></PageContainer>
  if (!claim || !proof) return <PageContainer><ErrorState message="Proof not found" /></PageContainer>

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href={`/claims/${claimId}`} label="Back to Claim" />
        <CopyLinkButton />
      </div>

      <PageHeader title="Proof Details" />

      <div className="space-y-6">
        <ClaimSummaryCard claim={claim} />
        <ProofInfoCard proof={proof} chainId={claim.chainId} />
        <VerifyProofCard
          proof={proof}
          claim={claim}
          transfers={transfers}
          csvTransfers={csvTransfers}
          csvFileName={csvFileName}
          verifying={verifying}
          fetchingTransfers={fetchingTransfers}
          onVerify={handleVerify}
          onFetchTransfers={fetchTransfersForVerification}
          onCsvUpload={handleCsvUpload}
          onClearCsv={handleClearCsv}
        />
      </div>
    </PageContainer>
  )
}
