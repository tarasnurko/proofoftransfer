'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
import type { ClaimEntity, EtherscanTransfer, ProofEntity } from '@/types'
import { mapTransferToDisplayItem } from '@/utils/transfer.utils'
import { getExplorerBaseUrl, getExplorerName } from '@/utils/explorer.utils'
import { getExpectedCsvFormat } from '@/lib/etherscan-csv'
import { Check, Loader2, CheckCircle2, Upload, FileText, X, ExternalLink, Wallet, AlertTriangle, Shield } from 'lucide-react'

interface CsvFile {
  name: string
  transfers: EtherscanTransfer[]
}

interface PreviousAttempt {
  isValid: boolean
  errorMessage: string | null
  verifiedAt: string
}

interface VerifyProofCardProps {
  proof: ProofEntity
  claim: ClaimEntity
  transfers: EtherscanTransfer[]
  csvFiles: CsvFile[]
  verifying: boolean
  verificationError: string | null
  fetchingTransfers: boolean
  isConnected: boolean
  alreadyVerified: boolean
  isSelfVerify: boolean
  derivedNullifier: string | null
  signingClaim: boolean
  hasTransfers: boolean
  previousAttempt: PreviousAttempt | null
  onVerify: () => void
  onConnectWallet: () => void
  onSignClaim: () => void
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
  verificationError,
  fetchingTransfers,
  isConnected,
  alreadyVerified,
  isSelfVerify,
  derivedNullifier,
  signingClaim,
  hasTransfers,
  previousAttempt,
  onVerify,
  onConnectWallet,
  onSignClaim,
  onFetchTransfers,
  onCsvUpload,
  onRemoveCsv,
}: VerifyProofCardProps) {
  const totalCsvTransfers = csvFiles.reduce((sum, file) => sum + file.transfers.length, 0)
  const canAddMore = csvFiles.length < 3

  const [activeTab, setActiveTab] = useState(csvFiles.length ? 'csv' : 'blockchain')

  const mappedBlockchainTransfers = useMemo(
    () => transfers.map(mapTransferToDisplayItem),
    [transfers],
  )

  const mappedCsvTransfers = useMemo(
    () => csvFiles.flatMap(file => file.transfers).map(mapTransferToDisplayItem),
    [csvFiles],
  )
  const decimals = claim.token?.decimals || 18
  const explorerBase = getExplorerBaseUrl(claim.chainId)
  const explorerName = getExplorerName(claim.chainId)
  const csvExportUrl = explorerBase
    ? `${explorerBase}/exportData?type=tokentxnsbyaddress&contract=${claim.tokenAddress}&a=${claim.counterpartyAddress}&decimal=${decimals}`
    : null

  // State machine: alreadyVerified → !connected → !signed → selfVerify → form
  const renderContent = () => {
    // 1. Already verified (from stats, before any signing)
    if (alreadyVerified) {
      return (
        <div className="flex flex-col items-center border-2 border-accent bg-accent/5 py-6">
          <CheckCircle2 className="h-8 w-8 text-accent" />
          <p className="mt-2 text-lg font-bold text-accent">Verification Successful</p>
          <p className="mt-0.5 text-sm text-muted-foreground">You have already verified this proof</p>
        </div>
      )
    }

    // 2. Not connected
    if (!isConnected) {
      return (
        <div className="border-4 border-dashed border-border p-8 text-center">
          <Wallet className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-bold">Connect Your Wallet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Connect your wallet to verify this proof
          </p>
          <Button onClick={onConnectWallet} className="border-4 font-bold">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      )
    }

    // 3. Not signed yet — show "Sign Claim" step
    if (!derivedNullifier) {
      return (
        <div className="border-4 border-dashed border-border p-6 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-bold">Sign Claim</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Sign the EIP-712 claim message to derive your verifier identity
          </p>
          <Button onClick={onSignClaim} disabled={signingClaim} className="border-4 font-bold">
            {signingClaim && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {signingClaim ? 'Signing...' : 'Sign Claim'}
          </Button>
        </div>
      )
    }

    // 4. Self-verify blocked
    if (isSelfVerify) {
      return (
        <div className="flex flex-col items-center border-2 border-destructive bg-destructive/5 py-6">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="mt-2 text-lg font-bold text-destructive">Cannot Verify Own Proof</p>
          <p className="mt-0.5 text-sm text-muted-foreground">The prover cannot verify their own proof</p>
        </div>
      )
    }

    // 5. Signed, not self — show transfer form + verify button
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-accent" />
          <span className="font-bold">Claim Signed</span>
        </div>

        {previousAttempt && !previousAttempt.isValid && (
          <div className="flex items-start gap-3 border-2 border-yellow-500 bg-yellow-500/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div>
              <p className="text-sm font-bold text-yellow-700">Previous verification failed</p>
              {previousAttempt.errorMessage && (
                <p className="text-sm text-yellow-600">{previousAttempt.errorMessage}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">You can retry with different transfers</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="blockchain">Fetch from Blockchain</TabsTrigger>
            <TabsTrigger value="csv">Upload CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="blockchain" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fetch transfers from the blockchain to view on-chain data for this proof.
            </p>

            {!transfers.length && !fetchingTransfers ? (
              <Button
                onClick={onFetchTransfers}
                disabled={fetchingTransfers}
                variant="outline"
                className="w-full border-2 font-bold"
              >
                Fetch Transfers
              </Button>
            ) : (
              <div className="space-y-4">
                {!fetchingTransfers && (
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent" />
                    <span className="font-bold">{transfers.length} transfers fetched</span>
                  </div>
                )}

                <details open={fetchingTransfers}>
                  <summary className="cursor-pointer text-sm font-bold text-accent hover:underline">
                    {fetchingTransfers ? 'Loading transfers...' : 'View transfers'}
                  </summary>
                  <div className="mt-2">
                    <VirtualTransferList
                      transfers={mappedBlockchainTransfers}
                      token={claim.token}
                      chainId={claim.chainId}
                      tokenType={claim.tokenType}
                      maxHeight={300}
                      isLoading={fetchingTransfers}
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
                      Expected format: {getExpectedCsvFormat(claim.tokenType)}
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
                      tokenType={claim.tokenType}
                      maxHeight={300}
                    />
                  </div>
                </details>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {verificationError && (
          <div className="flex items-start gap-3 border-2 border-destructive bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-sm font-bold text-destructive">Verification failed</p>
              <p className="text-sm text-destructive/80">{verificationError}</p>
            </div>
          </div>
        )}

        <Button
          onClick={onVerify}
          disabled={verifying || !hasTransfers}
          className="w-full border-4 font-bold"
        >
          {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {verifying ? 'Verifying...' : 'Verify Proof'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Verification may take 30+ seconds
        </p>
      </div>
    )
  }

  return (
    <Card className="border-4">
      <CardHeader>
        <div>
          <CardTitle className="text-2xl font-bold">Verify Proof</CardTitle>
          <CardDescription>
            Anyone except the prover can verify this proof
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  )
}
