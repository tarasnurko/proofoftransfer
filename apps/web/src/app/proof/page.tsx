'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Loader2 } from 'lucide-react'
import AppHeader from '@/components/app-header'

type Transfer = {
  hash: string
  from: string
  amount: string
  timestamp: string
}

type TransferFilter = 'all' | 'mine' | 'highlighted'

export default function GenerateProofPage() {
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [proverAddress, setProverAddress] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([])
  const [transferFilter, setTransferFilter] = useState<TransferFilter>('highlighted')
  const [proof, setProof] = useState<string | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([]) // Declare transfers variable
  
  // Check wallet connection status from localStorage or context
  useEffect(() => {
    // TODO: Check actual wallet connection status
    // For now, mock it
    const connected = false
    setWalletConnected(connected)
  }, [])

  // Mock claim data - in real app this would come from URL params or API
  const claimData = {
    id: '0x1234...5678',
    message: 'Have you transferred at least 100 USDC to Alice in the previous week?',
    tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    minAmount: '100',
    maxAmount: '0',
    fromTimestamp: '1704067200',
    toTimestamp: '1704672000',
  }

  const handleFetchTransfers = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first')
      return
    }
    
    setIsGenerating(true)
    console.log('[v0] Fetching transfers for prover:', proverAddress || walletAddress)
    
    // TODO: Fetch transfers from Etherscan API matching claim constraints
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock ALL transfers matching claim constraints (not just prover's)
    setAllTransfers([
      { hash: '0xabc...123', from: proverAddress || walletAddress, amount: '50', timestamp: '1704100000' },
      { hash: '0xdef...456', from: proverAddress || walletAddress, amount: '75', timestamp: '1704200000' },
      { hash: '0x111...222', from: '0xOther...Address1', amount: '120', timestamp: '1704150000' },
      { hash: '0x333...444', from: '0xOther...Address2', amount: '200', timestamp: '1704180000' },
    ])
    
    setIsGenerating(false)
  }
  
  const getFilteredTransfers = () => {
    const prover = proverAddress || walletAddress
    
    switch (transferFilter) {
      case 'mine':
        return allTransfers.filter(t => t.from === prover)
      case 'all':
        return allTransfers
      case 'highlighted':
      default:
        return allTransfers
    }
  }
  
  const isProverTransfer = (transfer: Transfer) => {
    const prover = proverAddress || walletAddress
    return transfer.from === prover
  }
  
  const myTransfersCount = allTransfers.filter(t => isProverTransfer(t)).length

  const handleGenerateProof = async () => {
    if (!walletConnected) {
      alert('Please connect your wallet first')
      return
    }
    
    const prover = proverAddress || walletAddress
    const myTransfers = allTransfers.filter(t => t.from === prover)
    
    if (myTransfers.length === 0) {
      alert('No transfers found for your address')
      return
    }
    
    setIsGenerating(true)
    console.log('[v0] Generating proof with transfers:', myTransfers)
    
    // TODO: Generate merkle proof and circuit proof using ONLY prover's transfers
    // Mock delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Mock proof
    setProof('0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890')
    
    setIsGenerating(false)
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
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">ID</div>
                  <div className="mt-1 text-foreground">{claimData.id}</div>
                </div>
                <div>
                  <div className="font-bold uppercase tracking-wide text-muted-foreground">Message</div>
                  <div className="mt-1 text-foreground">{claimData.message}</div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">Token</div>
                    <div className="mt-1 break-all text-foreground">{claimData.tokenAddress}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">Recipient</div>
                    <div className="mt-1 break-all text-foreground">{claimData.recipientAddress}</div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">Amount Range</div>
                    <div className="mt-1 text-foreground">
                      {claimData.minAmount} - {claimData.maxAmount === '0' ? '∞' : claimData.maxAmount}
                    </div>
                  </div>
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">Time Range</div>
                    <div className="mt-1 text-foreground">
                      {claimData.fromTimestamp} → {claimData.toTimestamp === '0' ? 'now' : claimData.toTimestamp}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Connection Required */}
            {!walletConnected && (
              <div className="border-4 border-accent bg-accent/10 p-6">
                <div className="text-center">
                  <h3 className="mb-4 text-xl font-bold uppercase text-foreground">
                    WALLET NOT CONNECTED
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Please connect your wallet to generate proofs
                  </p>
                </div>
              </div>
            )}

            {/* Prover Address Input - Optional override */}
            {walletConnected && (
              <div className="border-4 border-foreground bg-background p-6">
                <div className="mb-6 border-b-2 border-foreground pb-2">
                  <h3 className="text-xl font-bold uppercase text-foreground">GENERATE PROOF</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="proverAddress" className="text-sm font-bold uppercase tracking-wide">
                      Prover Address (Optional)
                    </Label>
                    <Input
                      id="proverAddress"
                      type="text"
                      placeholder={walletAddress || "0x..."}
                      value={proverAddress}
                      onChange={(e) => setProverAddress(e.target.value)}
                      className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
                    />
                    <p className="text-sm text-muted-foreground">
                      Leave empty to use connected wallet: {walletAddress}
                    </p>
                  </div>
                  <Button
                    onClick={handleFetchTransfers}
                    disabled={isGenerating}
                    className="w-full border-2 border-foreground bg-accent px-8 py-6 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background disabled:opacity-50"
                  >
                    {isGenerating ? (
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
            )}

            {/* Transfers List */}
            {allTransfers.length > 0 && walletConnected && (
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
                    <Button
                      onClick={() => setTransferFilter('highlighted')}
                      variant={transferFilter === 'highlighted' ? 'default' : 'outline'}
                      className={`border-2 border-foreground px-4 py-2 text-xs font-bold uppercase ${
                        transferFilter === 'highlighted'
                          ? 'bg-foreground text-background'
                          : 'bg-background hover:bg-foreground hover:text-background'
                      }`}
                    >
                      All (Highlight Mine)
                    </Button>
                    <Button
                      onClick={() => setTransferFilter('mine')}
                      variant={transferFilter === 'mine' ? 'default' : 'outline'}
                      className={`border-2 border-foreground px-4 py-2 text-xs font-bold uppercase ${
                        transferFilter === 'mine'
                          ? 'bg-foreground text-background'
                          : 'bg-background hover:bg-foreground hover:text-background'
                      }`}
                    >
                      Only Mine
                    </Button>
                    <Button
                      onClick={() => setTransferFilter('all')}
                      variant={transferFilter === 'all' ? 'default' : 'outline'}
                      className={`border-2 border-foreground px-4 py-2 text-xs font-bold uppercase ${
                        transferFilter === 'all'
                          ? 'bg-foreground text-background'
                          : 'bg-background hover:bg-foreground hover:text-background'
                      }`}
                    >
                      All
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-3">
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
                            <div className="font-bold uppercase text-muted-foreground">TX Hash</div>
                            <div className="mt-1 break-all text-foreground">{transfer.hash}</div>
                          </div>
                          <div>
                            <div className="font-bold uppercase text-muted-foreground">From</div>
                            <div className="mt-1 break-all text-foreground">
                              {transfer.from}
                              {isMine && <span className="ml-2 text-accent">(YOU)</span>}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold uppercase text-muted-foreground">Amount</div>
                            <div className="mt-1 text-foreground">{transfer.amount}</div>
                          </div>
                          <div>
                            <div className="font-bold uppercase text-muted-foreground">Timestamp</div>
                            <div className="mt-1 text-foreground">{transfer.timestamp}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                <div className="mt-6">
                  <Button
                    onClick={handleGenerateProof}
                    disabled={isGenerating || myTransfersCount === 0}
                    className="w-full border-2 border-foreground bg-foreground px-8 py-6 font-bold uppercase text-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Proof...
                      </>
                    ) : (
                      <>
                        Generate ZK Proof ({myTransfersCount} Transfers) <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Generated Proof */}
            {proof && (
              <div className="border-4 border-accent bg-background p-6">
                <div className="mb-6 border-b-2 border-accent pb-2">
                  <h3 className="text-xl font-bold uppercase text-accent">PROOF GENERATED</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="font-bold uppercase tracking-wide text-muted-foreground">
                      ZK Proof Hash
                    </div>
                    <div className="mt-2 break-all border-2 border-accent bg-background p-4 font-mono text-sm text-foreground">
                      {proof}
                    </div>
                  </div>
                  <Button
                    className="w-full border-2 border-accent bg-accent px-8 py-6 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background"
                  >
                    Submit Proof
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
