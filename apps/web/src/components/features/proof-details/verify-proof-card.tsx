'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
import type { ClaimEntity, EtherscanTransfer, ProofEntity } from '@/lib/types'
import { getExplorerBaseUrl, getExplorerName } from '@/lib/types'
import { Check, Loader2, CheckCircle2, XCircle, Upload, FileText, X, ExternalLink, Wallet } from 'lucide-react'

interface CsvFile {
  name: string
  transfers: EtherscanTransfer[]
}

interface VerifyProofCardProps {
  proof: ProofEntity
  claim: ClaimEntity
  transfers: EtherscanTransfer[]
  csvFiles: CsvFile[]
  verifying: boolean
  fetchingTransfers: boolean
  isConnected: boolean
  alreadyVerified: boolean
  hasTransfers: boolean
  onVerify: () => void
  onConnectWallet: () => void
  onFetchTransfers: () => void
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveCsv: (index: number) => void
}

export function VerifyProofCard({
  proof,
  claim,
  transfers,
  csvFiles,
  verifying,
  fetchingTransfers,
  isConnected,
  alreadyVerified,
  hasTransfers,
  onVerify,
  onConnectWallet,
  onFetchTransfers,
  onCsvUpload,
  onRemoveCsv,
}: VerifyProofCardProps) {
  const totalCsvTransfers = csvFiles.reduce((sum, file) => sum + file.transfers.length, 0)
  const canAddMore = csvFiles.length < 3

  const [activeTab, setActiveTab] = useState(csvFiles.length ? 'csv' : 'blockchain')

  const mappedBlockchainTransfers = useMemo(
    () => transfers.map((t) => ({
      from: t.from,
      amount: t.value,
      timestamp: parseInt(t.timeStamp),
    })),
    [transfers],
  )

  const mappedCsvTransfers = useMemo(
    () => csvFiles.flatMap(f => f.transfers).map((t) => ({
      from: t.from,
      amount: t.value,
      timestamp: parseInt(t.timeStamp),
    })),
    [csvFiles],
  )
  const decimals = claim.token?.decimals || 18
  const explorerBase = getExplorerBaseUrl(claim.chainId)
  const explorerName = getExplorerName(claim.chainId)
  const csvExportUrl = explorerBase
    ? `${explorerBase}/exportData?type=tokentxnsbyaddress&contract=${claim.tokenAddress}&a=${claim.recipientAddress}&decimal=${decimals}`
    : null

  const stats = proof.verificationStats

  return (
    <Card className="border-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Verify Proof</CardTitle>
            <CardDescription>
              Anyone except the prover can verify this proof
            </CardDescription>
          </div>
          {stats ? (
            <div className="flex items-center gap-3 text-sm font-bold">
              {stats.successful > 0 && (
                <span className="flex items-center gap-1 text-accent">
                  <CheckCircle2 className="h-4 w-4" />
                  {stats.successful} verified
                </span>
              )}
              {stats.failed > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" />
                  {stats.failed} failed
                </span>
              )}
            </div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {alreadyVerified ? (
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-accent" />
            <span className="font-bold">Proof has been verified successfully</span>
          </div>
        ) : !isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to verify this proof.
            </p>
            <Button
              onClick={onConnectWallet}
              className="w-full border-4 font-bold"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet to Verify
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide transfers (fetch from blockchain or upload CSV), then sign to verify the proof.
            </p>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="blockchain">Fetch from Blockchain</TabsTrigger>
                <TabsTrigger value="csv">Upload CSV</TabsTrigger>
              </TabsList>

              <TabsContent value="blockchain" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Fetch transfers from the blockchain to view on-chain data for this proof.
                </p>

                {!transfers.length ? (
                  <Button
                    onClick={onFetchTransfers}
                    disabled={fetchingTransfers}
                    variant="outline"
                    className="w-full border-2 font-bold"
                  >
                    {fetchingTransfers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
                          transfers={mappedBlockchainTransfers}
                          token={claim.token}
                          chainId={claim.chainId}
                          maxHeight={300}
                        />
                      </div>
                    </details>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="csv" className="space-y-4">
                <div className="space-y-2 rounded border-2 border-border bg-secondary/30 p-3 text-sm">
                  <p className="font-bold">How to get CSV:</p>
                  {csvExportUrl ? (
                    <a
                      href={csvExportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-accent underline underline-offset-2 hover:opacity-70"
                    >
                      Download transfers CSV from {explorerName}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground">
                      Download transfer data as CSV from your chain&apos;s block explorer.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Upload up to 3 CSV files. Transfers will be filtered by token, recipient, and date range automatically.
                  </p>
                </div>

                <div className="space-y-4">
                  {csvFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between border-2 border-border p-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-accent" />
                        <div>
                          <p className="text-sm font-bold">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.transfers.length} transfers</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveCsv(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {canAddMore && (
                    <label
                      htmlFor="csv-upload"
                      className="flex cursor-pointer flex-col items-center gap-3 border-4 border-dashed border-border p-6 transition-colors hover:bg-muted"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="font-bold">Upload CSV File ({csvFiles.length}/3)</p>
                        <p className="text-xs text-muted-foreground">
                          Expected format: Transaction Hash, Blockno, UnixTimestamp, From, To, Quantity
                        </p>
                      </div>
                      <span className="border-2 border-border bg-background px-4 py-2 text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow hover:shadow-none">
                        Choose File
                      </span>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv"
                        onChange={onCsvUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  {csvFiles.length > 0 && totalCsvTransfers > 0 && (
                    <details>
                      <summary className="cursor-pointer text-sm font-bold text-accent hover:underline">
                        View all transfers ({totalCsvTransfers})
                      </summary>
                      <div className="mt-2">
                        <VirtualTransferList
                          transfers={mappedCsvTransfers}
                          token={claim.token}
                          chainId={claim.chainId}
                          maxHeight={300}
                        />
                      </div>
                    </details>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={onVerify}
              disabled={verifying || !hasTransfers}
              className="w-full border-4 font-bold"
            >
              {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {verifying ? 'Verifying...' : 'Sign & Verify Proof'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
