'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'
import type { ClaimEntity, EtherscanTransfer, ProofEntity } from '@/lib/types'
import { Check, Loader2, CheckCircle2, XCircle, Upload, FileText, X } from 'lucide-react'

interface VerifyProofCardProps {
  proof: ProofEntity
  claim: ClaimEntity
  transfers: EtherscanTransfer[]
  csvTransfers: EtherscanTransfer[]
  csvFileName: string | null
  verifying: boolean
  fetchingTransfers: boolean
  onVerify: () => void
  onFetchTransfers: () => void
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearCsv: () => void
}

export function VerifyProofCard({
  proof,
  claim,
  transfers,
  csvTransfers,
  csvFileName,
  verifying,
  fetchingTransfers,
  onVerify,
  onFetchTransfers,
  onCsvUpload,
  onClearCsv,
}: VerifyProofCardProps) {
  return (
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
                  onClick={onFetchTransfers}
                  disabled={fetchingTransfers}
                  className="w-full border-4 font-bold"
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
                    onClick={onVerify}
                    disabled={verifying}
                    className="w-full border-4 font-bold"
                  >
                    {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
                    onChange={onCsvUpload}
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
                      onClick={onClearCsv}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {csvTransfers.length > 0 ? (
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
                        onClick={onVerify}
                        disabled={verifying}
                        className="w-full border-4 font-bold"
                      >
                        {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {verifying ? 'Verifying...' : 'Verify Proof'}
                      </Button>
                    </>
                  ) : null}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
