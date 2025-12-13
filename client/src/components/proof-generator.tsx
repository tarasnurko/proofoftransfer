'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import axios from 'axios'
import type { ERC20Transfer } from '@/services/etherscan'

export function ProofGenerator() {
  const { address, isConnected } = useAccount()
  const [recipient, setRecipient] = useState('')
  const [tokenAddress, setTokenAddress] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [fromBlock, setFromBlock] = useState<string>('')
  const [toBlock, setToBlock] = useState<string>('')
  const [transfers, setTransfers] = useState<ERC20Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingBlocks, setFetchingBlocks] = useState(false)

  // Fetch block numbers when dates change
  useEffect(() => {
    const fetchBlockNumbers = async () => {
      if (!fromDate || !toDate) return

      setFetchingBlocks(true)
      try {
        // From date: start of day (00:00:00)
        const fromDateObj = new Date(fromDate)
        fromDateObj.setHours(0, 0, 0, 0)
        const fromTimestamp = Math.floor(fromDateObj.getTime() / 1000)

        // To date: check if it's today
        const toDateObj = new Date(toDate)
        const today = new Date()
        const isToday = toDateObj.toDateString() === today.toDateString()

        let toTimestamp: number
        if (isToday) {
          // If "to" is today, use current time
          toTimestamp = Math.floor(Date.now() / 1000)
        } else {
          // Otherwise, use end of day (23:59:59)
          toDateObj.setHours(23, 59, 59, 999)
          toTimestamp = Math.floor(toDateObj.getTime() / 1000)
        }

        const [fromBlockRes, toBlockRes] = await Promise.all([
          axios.get('/api/block-number', {
            params: { timestamp: fromTimestamp.toString(), closest: 'after' },
          }),
          axios.get('/api/block-number', {
            params: { timestamp: toTimestamp.toString(), closest: 'before' },
          }),
        ])

        setFromBlock(fromBlockRes.data.blockNumber)
        setToBlock(toBlockRes.data.blockNumber)
      } catch (error) {
        console.error('Error fetching block numbers:', error)
      } finally {
        setFetchingBlocks(false)
      }
    }

    fetchBlockNumbers()
  }, [fromDate, toDate])

  const handleFetchTransfers = async () => {
    if (!address || !fromBlock || !toBlock) return

    setLoading(true)
    try {
      const response = await axios.get('/api/transfers', {
        params: {
          address,
          startblock: fromBlock,
          endblock: toBlock,
        },
      })

      let filteredTransfers = response.data.transfers

      // Filter by recipient if specified
      if (recipient) {
        filteredTransfers = filteredTransfers.filter(
          (t: ERC20Transfer) => t.to.toLowerCase() === recipient.toLowerCase()
        )
      }

      // Filter by token address if specified
      if (tokenAddress) {
        filteredTransfers = filteredTransfers.filter(
          (t: ERC20Transfer) =>
            t.contractAddress.toLowerCase() === tokenAddress.toLowerCase()
        )
      }

      setTransfers(filteredTransfers)
    } catch (error) {
      console.error('Error fetching transfers:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Please connect your wallet to generate a proof
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Generate ZK Proof</h1>
        <p className="text-muted-foreground">
          Prove your transfers without revealing your wallet address
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address (optional)</Label>
            <Input
              id="recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Token Address (optional)</Label>
            <Input
              id="token"
              placeholder="0x..."
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              {fromBlock && (
                <p className="text-xs text-muted-foreground">
                  Block: {fromBlock}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="toDate">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              {toBlock && (
                <p className="text-xs text-muted-foreground">Block: {toBlock}</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleFetchTransfers}
            disabled={!fromBlock || !toBlock || loading || fetchingBlocks}
            className="w-full"
          >
            {loading
              ? 'Fetching Transfers...'
              : fetchingBlocks
              ? 'Fetching Block Numbers...'
              : 'Fetch Transfers'}
          </Button>
        </div>
      </div>

      {transfers.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold">
            Transfers Found: {transfers.length}
          </h2>

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
                    <span className="text-muted-foreground">To:</span>{' '}
                    <span className="font-mono">{transfer.to}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Token:</span>{' '}
                    <span className="font-mono">{transfer.contractAddress}</span>
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

      {transfers.length === 0 && !loading && fromBlock && toBlock && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 text-center">
          <p className="text-muted-foreground">
            No transfers found for the specified criteria
          </p>
        </div>
      )}
    </div>
  )
}
