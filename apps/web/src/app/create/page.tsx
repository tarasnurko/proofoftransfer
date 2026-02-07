'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { isValidAddress } from '@/lib/address-utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimDetailsCard, TokenInfoCard, AmountConstraintsCard, TimeRangeCard, TransfersPreviewCard } from '@/components/features/create-claim'
import { createClaimAction, fetchClaimTransfersAction } from '@/actions/claims.actions'
import { fetchAndStoreTokenDataAction } from '@/actions'
import { useDebounce } from '@/hooks/use-debounce'
import type { TokenEntity, TransferEntity } from '@/db/index.types'
import { ChainId } from '@repo/types'

const FETCH_RELEVANT_FIELDS = new Set(['chainId', 'tokenAddress', 'recipientAddress', 'fromDate', 'toDate'])

export default function CreateClaimPage() {
  const router = useRouter()
  const { address: walletAddress, isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [showOnlyMyTransfers, setShowOnlyMyTransfers] = useState(false)
  const [formData, setFormData] = useState({
    claimMessage: '',
    chainId: ChainId.BASE as number,
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

  const handleChange = useCallback((field: string, value: string | number | Date | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (FETCH_RELEVANT_FIELDS.has(field)) {
      setFetchedTransfers(null)
    }
    setErrors((prev) => {
      if (!prev[field]) return prev
      const { [field]: _, ...rest } = prev
      return rest
    })
  }, [])

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

  const validateForm = useCallback(() => {
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

    try {
      if (formData.minTransfersSum && formData.maxTransfersSum) {
        const min = BigInt(formData.minTransfersSum)
        const max = BigInt(formData.maxTransfersSum)
        if (max < min && max > 0n) {
          newErrors.maxTransfersSum = 'Maximum must be greater than minimum'
        }
      }
    } catch {
      newErrors.maxTransfersSum = 'Invalid amount value'
    }

    if (formData.fromDate && formData.toDate) {
      if (formData.toDate <= formData.fromDate) {
        newErrors.toDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return !Object.keys(newErrors).length
  }, [formData])

  const handleFetchTransfers = useCallback(async () => {
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
  }, [validateForm, formData])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
        creatorAddress: walletAddress || '',
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
    } finally {
      setLoading(false)
    }
  }, [validateForm, formData, router])

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
        <ClaimDetailsCard
          claimMessage={formData.claimMessage}
          error={errors.claimMessage}
          onChange={handleChange}
        />

        <TokenInfoCard
          chainId={formData.chainId}
          tokenAddress={formData.tokenAddress}
          recipientAddress={formData.recipientAddress}
          isFetchingToken={isFetchingToken}
          tokenData={tokenData}
          tokenError={tokenError}
          errors={errors}
          onChange={handleChange}
        />

        <AmountConstraintsCard
          minTransfersSum={formData.minTransfersSum}
          maxTransfersSum={formData.maxTransfersSum}
          error={errors.maxTransfersSum}
          onChange={handleChange}
        />

        <TimeRangeCard
          fromDate={formData.fromDate}
          toDate={formData.toDate}
          error={errors.toDate}
          onChange={handleChange}
        />

        {displayedTransfers && displayedTransfers.length > 0 ? (
          <TransfersPreviewCard
            transfers={displayedTransfers}
            tokenData={tokenData}
            walletAddress={walletAddress}
            chainId={formData.chainId}
            isConnected={isConnected}
            userTransferCount={userTransferCount}
            showOnlyMyTransfers={showOnlyMyTransfers}
            onToggleMyTransfers={() => setShowOnlyMyTransfers(prev => !prev)}
          />
        ) : null}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/')} disabled={loading || isFetchingTransfers}>
            Cancel
          </Button>
          {fetchedTransfers === null ? (
            <Button type="button" onClick={handleFetchTransfers} disabled={isFetchingTransfers} className="flex-1">
              {isFetchingTransfers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Fetch Transfers
            </Button>
          ) : (
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Claim
            </Button>
          )}
        </div>
      </form>
    </PageContainer>
  )
}
