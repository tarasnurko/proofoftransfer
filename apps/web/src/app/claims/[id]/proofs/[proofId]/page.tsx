'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/shared/loading-state'
import { ErrorState } from '@/components/shared/error-state'
import { CopyHash } from '@/components/shared/copy-hash'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { Address } from '@/components/shared/address'
import type { ClaimEntity, ProofEntity } from '@/lib/types'
import { getChainName } from '@/lib/types'
import { ChainBadge } from '@/components/shared/chain-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
import type { EtherscanTransfer } from '@/lib/types'
import { ArrowLeft, Shield, Check, Loader2, CheckCircle2, XCircle, Upload, FileText, X } from 'lucide-react'
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

  const fetchData = async () => {
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
  }

  const handleVerify = async () => {
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
  }

  const fetchTransfersForVerification = async () => {
    setFetchingTransfers(true)
    try {
      const response = await fetch(`/api/claims/${claimId}/transfers`)
      if (!response.ok) throw new Error('Failed to fetch transfers')
      const data = await response.json()
      setTransfers(data)
      toast.success(`Fetched ${data.length} transfers`)
    } catch (err) {
      toast.error('Failed to fetch transfers')
      console.error(err)
    } finally {
      setFetchingTransfers(false)
    }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  }

  if (loading) return <PageContainer><LoadingState message="Loading proof details..." /></PageContainer>
  if (error) return <PageContainer><ErrorState message={error} /></PageContainer>
  if (!claim || !proof) return <PageContainer><ErrorState message="Proof not found" /></PageContainer>

  return (
    <PageContainer>
      <div className="mb-4 flex items-center justify-between">
        <Link href={`/claims/${claimId}`} className="inline-flex items-center text-sm hover:opacity-80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Claim
        </Link>
        <CopyLinkButton />
      </div>

      <div className="mb-8 space-y-2 border-b-4 border-border pb-6">
        <h1 className="text-balance text-4xl font-bold uppercase tracking-tight">Proof Details</h1>
      </div>

      <div className="space-y-6">
        {/* Claim Information */}
        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Claim Information</CardTitle>
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
                <div className="mt-1">
                  {claim.token ? `${claim.token.name} (${claim.token.symbol})` : 'Unknown'}
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
          </CardContent>
        </Card>

        {/* Proof Details */}
        <Card className="border-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">Proof Information</CardTitle>
              {proof.verified !== undefined && (
                <Badge variant={proof.verified ? 'default' : 'destructive'} className="text-lg">
                  {proof.verified ? 'Valid' : 'Invalid'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-bold text-muted-foreground">Nullifier</div>
              <div className="mt-1">
                <CopyHash hash={proof.nullifier} />
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-muted-foreground">Proof Data</div>
              <details className="mt-1">
                <summary className="cursor-pointer text-sm text-accent hover:underline">
                  Show proof data
                </summary>
                <pre className="mt-2 overflow-x-auto rounded border-2 border-border bg-muted p-4 text-xs">
                  {proof.proofData}
                </pre>
              </details>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-sm font-bold text-muted-foreground">Transfers Root Hash</div>
                <div className="mt-1">
                  <CopyHash hash={proof.transfersRootHash} />
                </div>
              </div>
              <div>
                <div className="text-sm font-bold text-muted-foreground">Submitted</div>
                <div className="mt-1">{new Date(proof.createdAt).toLocaleString()}</div>
              </div>
            </div>

            {proof.proverAddress && (
              <div>
                <div className="text-sm font-bold text-muted-foreground">Prover Address</div>
                <div className="mt-1">
                  <Address address={proof.proverAddress} chainId={claim.chainId} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verify Proof Section */}
        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Verify Proof</CardTitle>
            <CardDescription>
              Verify this proof using blockchain data or CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {proof.verified !== undefined ? (
              <div className="flex items-center gap-3">
                {proof.verified ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <span className="font-bold">Proof is valid</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-destructive" />
                    <span className="font-bold text-destructive">Proof is invalid</span>
                  </>
                )}
              </div>
            ) : (
              <Tabs defaultValue="blockchain" className="w-full">
                <TabsList>
                  <TabsTrigger value="blockchain">Fetch from Blockchain</TabsTrigger>
                  <TabsTrigger value="csv">Upload CSV</TabsTrigger>
                </TabsList>

                <TabsContent value="blockchain" className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Fetch transfers from the blockchain to verify this proof against real on-chain data.
                  </p>

                  {!transfers.length ? (
                    <Button
                      onClick={fetchTransfersForVerification}
                      disabled={fetchingTransfers}
                      className="w-full border-4 font-bold"
                    >
                      {fetchingTransfers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {fetchingTransfers ? 'Fetching...' : 'Fetch Transfers'}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-accent" />
                        <span className="font-bold">{transfers.length} transfers fetched</span>
                      </div>

                      <details>
                        <summary className="cursor-pointer text-sm font-bold text-accent hover:underline">
                          View transfers
                        </summary>
                        <div className="mt-2">
                          <VirtualTransferList
                            transfers={transfers.map((t) => ({
                              from: t.from,
                              amount: t.value,
                              timestamp: parseInt(t.timeStamp),
                            }))}
                            token={claim.token}
                            chainId={claim.chainId}
                            maxHeight={300}
                          />
                        </div>
                      </details>

                      <Button
                        onClick={handleVerify}
                        disabled={verifying}
                        className="w-full border-4 font-bold"
                      >
                        {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {verifying ? 'Verifying...' : 'Verify Proof'}
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="csv" className="space-y-4">
                  {!csvFileName ? (
                    <label
                      htmlFor="csv-upload"
                      className="flex cursor-pointer flex-col items-center gap-3 border-4 border-dashed border-border p-8 transition-colors hover:bg-muted"
                    >
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-bold">Upload CSV File</p>
                        <p className="text-sm text-muted-foreground">
                          Download transfer data from Etherscan as CSV and upload it here
                        </p>
                      </div>
                      <span className="border-2 border-border bg-background px-4 py-2 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow hover:shadow-none">
                        Choose File
                      </span>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-2 border-border p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-accent" />
                          <div>
                            <p className="text-sm font-bold">{csvFileName}</p>
                            <p className="text-xs text-muted-foreground">{csvTransfers.length} transfers parsed</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setCsvFileName(null); setCsvTransfers([]) }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {csvTransfers.length > 0 && (
                        <>
                          <details>
                            <summary className="cursor-pointer text-sm font-bold text-accent hover:underline">
                              View transfers
                            </summary>
                            <div className="mt-2">
                              <VirtualTransferList
                                transfers={csvTransfers.map((t) => ({
                                  from: t.from,
                                  amount: t.value,
                                  timestamp: parseInt(t.timeStamp),
                                }))}
                                token={claim.token}
                                chainId={claim.chainId}
                                maxHeight={300}
                              />
                            </div>
                          </details>

                          <Button
                            onClick={handleVerify}
                            disabled={verifying}
                            className="w-full border-4 font-bold"
                          >
                            {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {verifying ? 'Verifying...' : 'Verify Proof'}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
