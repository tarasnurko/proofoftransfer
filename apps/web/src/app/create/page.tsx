'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import { SUPPORTED_CHAINS } from '@/lib/types'
import { isValidAddress } from '@/lib/address-utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { createClaimAction, fetchClaimTransfersAction } from '@/actions/claims.actions'
import { fetchAndStoreTokenDataAction } from '@/actions'
import { useDebounce } from '@/hooks/use-debounce'
import type { TokenEntity, TransferEntity } from '@/db/index.types'
import { VirtualTransferList } from '@/components/shared/virtual-transfer-list'

const FETCH_RELEVANT_FIELDS = new Set(['chainId', 'tokenAddress', 'recipientAddress', 'fromDate', 'toDate'])

export default function CreateClaimPage() {
  const router = useRouter()
  const { address: walletAddress, isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [showOnlyMyTransfers, setShowOnlyMyTransfers] = useState(false)
  const [formData, setFormData] = useState({
    claimMessage: '',
    chainId: 8453,
    tokenAddress: '',
    recipientAddress: '',
    minTransfersSum: '0',
    maxTransfersSum: '0',
    fromDate: null as Date | null,
    toDate: null as Date | null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tokenData, setTokenData] = useState<TokenEntity | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isFetchingToken, setIsFetchingToken] = useState(false)
  const [fetchedTransfers, setFetchedTransfers] = useState<TransferEntity[] | null>(null)
  const [isFetchingTransfers, setIsFetchingTransfers] = useState(false)
  const debouncedTokenAddress = useDebounce(formData.tokenAddress, 500)

  useEffect(() => {
    if (!debouncedTokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(debouncedTokenAddress)) {
      setTokenData(null)
      setTokenError(null)
      return
    }

    setIsFetchingToken(true)
    setTokenError(null)
    fetchAndStoreTokenDataAction({
      tokenAddress: debouncedTokenAddress,
      chainId: formData.chainId,
    })
      .then((result) => {
        if (result?.data?.data) {
          setTokenData(result.data.data)
          setTokenError(null)
        } else {
          setTokenData(null)
          setTokenError(result?.serverError || 'Token not found on this chain')
        }
      })
      .catch(() => {
        setTokenData(null)
        setTokenError('Token not found — check the address and chain')
      })
      .finally(() => setIsFetchingToken(false))
  }, [debouncedTokenAddress, formData.chainId])

  const handleChange = (field: string, value: string | number | Date | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (FETCH_RELEVANT_FIELDS.has(field)) {
      setFetchedTransfers(null)
    }
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const filteredTransfers = useMemo(() => {
    if (!fetchedTransfers) return null
    const decimals = tokenData?.decimals ?? 18
    const parseAmount = (val: string) => {
      try {
        if (!val || val === '0') return null
        const num = Number(val)
        if (isNaN(num) || num <= 0) return null
        return BigInt(Math.floor(num * 10 ** decimals))
      } catch { return null }
    }
    const min = parseAmount(formData.minTransfersSum)
    const max = parseAmount(formData.maxTransfersSum)
    if (!min && !max) return fetchedTransfers
    return fetchedTransfers.filter((t) => {
      const amount = BigInt(t.amount)
      if (min && amount < min) return false
      if (max && amount > max) return false
      return true
    })
  }, [fetchedTransfers, formData.minTransfersSum, formData.maxTransfersSum, tokenData?.decimals])

  const displayedTransfers = useMemo(() => {
    if (!filteredTransfers) return null
    if (!showOnlyMyTransfers || !walletAddress) return filteredTransfers
    return filteredTransfers.filter((t) => t.senderAddress.toLowerCase() === walletAddress.toLowerCase())
  }, [filteredTransfers, showOnlyMyTransfers, walletAddress])

  const userTransferCount = useMemo(() => {
    if (!filteredTransfers || !walletAddress) return 0
    return filteredTransfers.filter((t) => t.senderAddress.toLowerCase() === walletAddress.toLowerCase()).length
  }, [filteredTransfers, walletAddress])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.claimMessage || formData.claimMessage.length < 10) {
      newErrors.claimMessage = 'Message must be at least 10 characters'
    }
    if (formData.claimMessage.length > 1000) {
      newErrors.claimMessage = 'Message must be less than 1000 characters'
    }

    if (!isValidAddress(formData.tokenAddress)) {
      newErrors.tokenAddress = 'Invalid token address'
    }

    if (!isValidAddress(formData.recipientAddress)) {
      newErrors.recipientAddress = 'Invalid recipient address'
    }

    if (formData.minTransfersSum && formData.maxTransfersSum) {
      const min = BigInt(formData.minTransfersSum)
      const max = BigInt(formData.maxTransfersSum)
      if (max < min && max > 0n) {
        newErrors.maxTransfersSum = 'Maximum must be greater than minimum'
      }
    }

    if (formData.fromDate && formData.toDate) {
      if (formData.toDate <= formData.fromDate) {
        newErrors.toDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return !Object.keys(newErrors).length
  }

  const handleFetchTransfers = async () => {
    if (!validateForm()) {
      toast.error('Please fill the form correctly')
      return
    }

    setIsFetchingTransfers(true)
    try {
      const result = await fetchClaimTransfersAction({
        chainId: formData.chainId,
        tokenAddress: formData.tokenAddress,
        recipientAddress: formData.recipientAddress,
        fromDate: formData.fromDate ?? undefined,
        toDate: formData.toDate ?? undefined,
      })

      if (result?.serverError) {
        throw new Error(result.serverError)
      }

      if (result?.validationErrors) {
        toast.error('Invalid form data')
        return
      }

      setFetchedTransfers(result?.data?.transfers ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch transfers')
    } finally {
      setIsFetchingTransfers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fill the form correctly')
      return
    }

    setLoading(true)

    try {
      const result = await createClaimAction({
        ...formData,
        fromDate: formData.fromDate ?? undefined,
        toDate: formData.toDate ?? undefined,
      })

      if (result?.serverError) {
        throw new Error(result.serverError)
      }

      if (result?.validationErrors) {
        const validationErrors: Record<string, string> = {}
        Object.entries(result.validationErrors).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            validationErrors[key] = value[0] || 'Invalid value'
          }
        })
        setErrors(validationErrors)
        toast.error('Please fill the form correctly')
        return
      }

      toast.success('Claim created successfully!')
      router.push('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create claim')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer>
      <div className="mb-4">
        <BackLink href="/" label="Back to Claims" />
      </div>

      <PageHeader
        title="Create Claim"
        description="Set up a verifiable transfer claim that others can prove using zero-knowledge proofs"
      />

      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Claim Details</CardTitle>
            <CardDescription>Describe the purpose of this claim</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Claim Message *</Label>
              <Textarea
                id="message"
                placeholder="e.g., Donation to the community pool for Q1 2024"
                value={formData.claimMessage}
                onChange={(e) => handleChange('claimMessage', e.target.value)}
                className="min-h-24"
              />
              {errors.claimMessage && <p className="text-sm text-destructive">{errors.claimMessage}</p>}
              <p className="text-sm text-muted-foreground">{formData.claimMessage.length} / 1000 characters</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Token Information</CardTitle>
            <CardDescription>Specify the blockchain and token</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="chainId">Chain *</Label>
              <Select value={formData.chainId.toString()} onValueChange={(value) => handleChange('chainId', Number.parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CHAINS.map((chain) => (
                    <SelectItem key={chain.id} value={chain.id.toString()}>
                      {chain.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenAddress">Token Address *</Label>
              <div className="relative">
                <Input
                  id="tokenAddress"
                  placeholder="0x..."
                  value={formData.tokenAddress}
                  onChange={(e) => handleChange('tokenAddress', e.target.value)}
                  className="font-mono"
                />
                {isFetchingToken && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {errors.tokenAddress && <p className="text-sm text-destructive">{errors.tokenAddress}</p>}
              {tokenError && <p className="text-sm text-destructive">{tokenError}</p>}
              {tokenData && (
                <p className="font-mono text-sm font-bold text-accent">
                  {tokenData.name} ({tokenData.symbol})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientAddress">Recipient Address *</Label>
              <Input
                id="recipientAddress"
                placeholder="0x..."
                value={formData.recipientAddress}
                onChange={(e) => handleChange('recipientAddress', e.target.value)}
                className="font-mono"
              />
              {errors.recipientAddress && <p className="text-sm text-destructive">{errors.recipientAddress}</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Amount Constraints</CardTitle>
            <CardDescription>Optional - Set minimum and maximum transfer amounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minTransfersSum">Minimum Amount</Label>
                <Input
                  id="minTransfersSum"
                  placeholder="0"
                  value={formData.minTransfersSum}
                  onChange={(e) => handleChange('minTransfersSum', e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTransfersSum">Maximum Amount</Label>
                <Input
                  id="maxTransfersSum"
                  placeholder="0"
                  value={formData.maxTransfersSum}
                  onChange={(e) => handleChange('maxTransfersSum', e.target.value)}
                  className="font-mono"
                />
                {errors.maxTransfersSum && <p className="text-sm text-destructive">{errors.maxTransfersSum}</p>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Leave as 0 for no constraint</p>
          </CardContent>
        </Card>

        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Time Range</CardTitle>
            <CardDescription>Optional - Set the date range for valid transfers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromDate">Start Date</Label>
                <DatePicker
                  date={formData.fromDate || undefined}
                  onSelect={(date) => handleChange('fromDate', date || null)}
                  placeholder="Select start date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toDate">End Date</Label>
                <DatePicker
                  date={formData.toDate || undefined}
                  onSelect={(date) => handleChange('toDate', date || null)}
                  placeholder="Select end date"
                />
                {errors.toDate && <p className="text-sm text-destructive">{errors.toDate}</p>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Leave empty for no time constraints</p>
          </CardContent>
        </Card>

        {displayedTransfers && displayedTransfers.length > 0 && (
          <Card className="border-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold">Transfers Preview</CardTitle>
                  <CardDescription>{displayedTransfers.length} transfers found</CardDescription>
                </div>
                {isConnected && userTransferCount > 0 && (
                  <Button
                    type="button"
                    variant={showOnlyMyTransfers ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShowOnlyMyTransfers(!showOnlyMyTransfers)}
                    className="border-2 font-bold"
                  >
                    {showOnlyMyTransfers ? 'Show All' : `My Transfers (${userTransferCount})`}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <VirtualTransferList
                transfers={displayedTransfers.map((t) => ({
                  from: t.senderAddress,
                  amount: t.amount,
                  timestamp: t.blockTimestamp,
                }))}
                token={tokenData ? { decimals: tokenData.decimals, symbol: tokenData.symbol } : null}
                walletAddress={walletAddress}
                chainId={formData.chainId}
                maxHeight={300}
              />
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/')} disabled={loading || isFetchingTransfers}>
            Cancel
          </Button>
          {fetchedTransfers === null ? (
            <Button type="button" onClick={handleFetchTransfers} disabled={isFetchingTransfers} className="flex-1">
              {isFetchingTransfers && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Fetch Transfers
            </Button>
          ) : (
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Claim
            </Button>
          )}
        </div>
      </form>
    </PageContainer>
  )
}
