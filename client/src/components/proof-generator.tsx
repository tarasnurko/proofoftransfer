'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import axios from 'axios'
import type { ERC20Transfer } from '@/services/etherscan'
import { keccak256, toUtf8Bytes } from 'ethers'

export function ProofGenerator() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [recipient, setRecipient] = useState('')
  const [tokenAddress, setTokenAddress] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [fromBlock, setFromBlock] = useState<string>('39350527')
  const [toBlock, setToBlock] = useState<string>('39426500')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [message, setMessage] = useState('')
  const [transfers, setTransfers] = useState<ERC20Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingBlocks, setFetchingBlocks] = useState(false)
  const [generatingProof, setGeneratingProof] = useState(false)
  const [proofLogs, setProofLogs] = useState<string[]>([])
  const [generatedProofId, setGeneratedProofId] = useState<number | null>(null)

  // Fetch block numbers when dates change
  useEffect(() => {
    const fetchBlockNumbers = async () => {
      if (!fromDate) return

      setFetchingBlocks(true)
      try {
        // From date: start of day (00:00:00)
        const fromDateObj = new Date(fromDate)
        fromDateObj.setHours(0, 0, 0, 0)
        const fromTimestamp = Math.floor(fromDateObj.getTime() / 1000)

        // To date: if not provided, use current time
        let toTimestamp: number
        if (!toDate) {
          // No "to" date specified - use current time
          toTimestamp = Math.floor(Date.now() / 1000)
        } else {
          // Check if it's today
          const toDateObj = new Date(toDate)
          const today = new Date()
          const isToday = toDateObj.toDateString() === today.toDateString()

          if (isToday) {
            // If "to" is today, use current time
            toTimestamp = Math.floor(Date.now() / 1000)
          } else {
            // Otherwise, use end of day (23:59:59)
            toDateObj.setHours(23, 59, 59, 999)
            toTimestamp = Math.floor(toDateObj.getTime() / 1000)
          }
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

  const handleGenerateProof = async () => {
    if (!address || !recipient || !tokenAddress || transfers.length === 0) {
      alert('Please fill all required fields and fetch transfers first')
      return
    }

    setGeneratingProof(true)
    setProofLogs([])
    setGeneratedProofId(null)

    const showLog = (log: string) => {
      setProofLogs((prev) => [...prev, log])
    }

    try {
      // Step 1: Sign message
      showLog('Please sign the message in your wallet... ⏳')
      const messageText = message || `Proof of transfer to ${recipient}`
      const signature = await signMessageAsync({ message: messageText })
      // Use hashMessage to get Ethereum prefixed message hash (what MetaMask actually signs)
      const { hashMessage } = await import('ethers')
      const messageHash = hashMessage(messageText)
      showLog('Message signed ✅')

      // Step 2: Generate random salt for address commitment
      // Must fit within BN254 field modulus
      const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
      const randomBytes = crypto.getRandomValues(new Uint8Array(32))
      const randomBigInt = BigInt('0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join(''))
      const saltBigInt = randomBigInt % BN254_FIELD_MODULUS
      const salt = '0x' + saltBigInt.toString(16).padStart(64, '0')

      // Step 3: Compute address commitment
      showLog('Computing address commitment... ⏳')
      const addressCommitmentHash = keccak256(
        Buffer.from(address.slice(2) + salt.slice(2), 'hex')
      )
      // Take modulo to fit within BN254 field
      const addressCommitmentBigInt = BigInt(addressCommitmentHash) % BN254_FIELD_MODULUS
      const addressCommitment = '0x' + addressCommitmentBigInt.toString(16).padStart(64, '0')
      showLog('Address commitment computed ✅')

      // Step 4: Recover public key from signature
      showLog('Recovering public key from signature... ⏳')
      const { verifyMessage, SigningKey } = await import('ethers')

      // Verify signature is valid
      const recoveredAddress = verifyMessage(messageText, signature)
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('Signature verification failed')
      }

      // Recover public key from signature
      const recoveredPubKey = SigningKey.recoverPublicKey(messageHash, signature)

      // Extract x and y coordinates from uncompressed public key
      // Format: 0x04 + x (32 bytes) + y (32 bytes)
      const pubKeyBytes = recoveredPubKey.slice(4) // Remove '0x04' prefix
      const pubKeyX = '0x' + pubKeyBytes.slice(0, 64) // First 32 bytes (64 hex chars)
      const pubKeyY = '0x' + pubKeyBytes.slice(64, 128) // Last 32 bytes (64 hex chars)

      showLog(`Public key recovered ✅`)

      // Step 5: Send to server for ZK proof generation
      showLog('Sending data to proof server for ZK proof generation... ⏳')

      // ALWAYS use very large max amount to avoid u128 overflow
      const safeMaxAmount = '1000000000000000000000000000000' // 1e30 - very safe for u128
      const safeMinAmount = minAmount || '0'

      console.log('CLIENT DEBUG - About to send:', {
        minAmount: safeMinAmount,
        maxAmount: safeMaxAmount,
        minAmountState: minAmount,
        maxAmountState: maxAmount,
      })

      const response = await axios.post('/api/generate-proof', {
        addressCommitment,
        message: messageText,
        signature,
        messageHash,
        senderAddress: address,
        salt,
        publicKeyX: pubKeyX,
        publicKeyY: pubKeyY,
        allTransfers: transfers,
        proverTransfers: transfers,
        tokenAddress,
        receiverAddress: recipient,
        startDate: fromDate ? Math.floor(new Date(fromDate).getTime() / 1000) : 0,
        endDate: toDate
          ? Math.floor(new Date(toDate).getTime() / 1000)
          : Math.floor(Date.now() / 1000),
        minAmount: safeMinAmount,
        maxAmount: safeMaxAmount,
      })

      // Display server logs
      if (response.data.logs) {
        response.data.logs.forEach((log: string) => showLog(log))
      }

      setGeneratedProofId(response.data.proofId)
      showLog(`Proof stored with ID: ${response.data.proofId} ✅`)
      showLog('Proof generation complete! 🎉')
    } catch (error: any) {
      console.error('Error generating proof:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Failed to generate proof'
      showLog(`Error: ${errorMsg} ❌`)
    } finally {
      setGeneratingProof(false)
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
              <Label htmlFor="minAmount">Min Amount (optional)</Label>
              <Input
                id="minAmount"
                type="number"
                step="any"
                placeholder="0.0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxAmount">Max Amount (optional)</Label>
              <Input
                id="maxAmount"
                type="number"
                step="any"
                placeholder="0.0"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Input
              id="message"
              placeholder="e.g., Proof for charity donation"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This message will be signed to bind the proof to a context
            </p>
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
              <Label htmlFor="toDate">To Date (optional)</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="Leave empty for current time"
              />
              {toBlock && (
                <p className="text-xs text-muted-foreground">
                  Block: {toBlock}
                  {!toDate && ' (current)'}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <Button
              onClick={handleGenerateProof}
              disabled={
                !recipient ||
                !tokenAddress ||
                transfers.length === 0 ||
                generatingProof
              }
              className="w-full"
              variant="default"
            >
              {generatingProof ? 'Generating Proof...' : 'Generate Proof'}
            </Button>
          </div>
        </div>
      </div>

      {proofLogs.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-lg border p-6 space-y-4">
          <h2 className="text-xl font-semibold">Proof Generation Logs</h2>
          <div className="space-y-1 font-mono text-sm">
            {proofLogs.map((log, index) => (
              <div key={index} className="text-muted-foreground">
                {log}
              </div>
            ))}
          </div>
          {generatedProofId && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200 font-semibold">
                Proof ID: {generatedProofId}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                Your proof has been generated and stored successfully!
              </p>
            </div>
          )}
        </div>
      )}

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
