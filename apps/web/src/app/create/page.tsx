'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useConnection } from 'wagmi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { isAddressEqual, isAddress, type Address } from 'viem'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PageContainer } from '@/components/layout/page-container'
import { Button } from '@/components/ui/button'
import { BackLink } from '@/components/shared/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimDetailsCard, TokenInfoCard, AmountConstraintsCard, TimeRangeCard, TransfersPreviewCard } from '@/components/features/create-claim'
import { createClaimAction } from '@/actions/claims.actions'
import { useDebounce } from '@/hooks/use-debounce'
import { useGetTokenData, useLoadClaimTransfers, useResolveEns } from '@/hooks/queries'
import { createClaimClientSchema, type CreateClaimClientInput } from '@/validations/claim'
import type { TransferEntity } from '@/db/index.types'
import { ChainId } from '@repo/types'

const DEBOUNCE_MS = 500
const FETCH_RELEVANT_FIELDS = new Set(['chainId', 'tokenAddress', 'recipientAddress', 'fromDate', 'toDate'])

export default function CreateClaimPage() {
  const router = useRouter()
  const { address: walletAddress, isConnected } = useConnection()
  const [loading, setLoading] = useState(false)
  const [showOnlyMyTransfers, setShowOnlyMyTransfers] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CreateClaimClientInput>({
    resolver: zodResolver(createClaimClientSchema),
    defaultValues: {
      claimMessage: '',
      chainId: ChainId.ETHEREUM,
      tokenAddress: '',
      recipientAddress: '',
      minTransfersSum: '0',
      maxTransfersSum: '0',
      fromDate: null,
      toDate: null,
    },
  })

  const watchedTokenAddress = watch('tokenAddress')
  const watchedChainId = watch('chainId')
  const watchedMinTransfersSum = watch('minTransfersSum')
  const watchedMaxTransfersSum = watch('maxTransfersSum')
  const watchedRecipientAddress = watch('recipientAddress')

  const debouncedTokenAddress = useDebounce(watchedTokenAddress, DEBOUNCE_MS)
  const debouncedRecipient = useDebounce(watchedRecipientAddress, DEBOUNCE_MS)
  const [fetchedTransfers, setFetchedTransfers] = useState<TransferEntity[] | null>(null)

  const {
    data: ensResolution = null,
    isLoading: isResolvingEns,
    error: ensQueryError,
  } = useResolveEns({ input: debouncedRecipient })

  const ensError = ensQueryError
    ? (debouncedRecipient.trim().endsWith('.eth') ? 'Could not resolve ENS name' : null)
    : null

  const resolvedRecipientAddress = ensResolution?.address ?? null

  const isValidToken = !!debouncedTokenAddress && isAddress(debouncedTokenAddress)

  const {
    data: tokenData = null,
    isLoading: isFetchingToken,
    error: tokenQueryError,
  } = useGetTokenData({
    tokenAddress: debouncedTokenAddress,
    chainId: watchedChainId,
    enabled: isValidToken,
  })

  const tokenError = isValidToken && tokenQueryError
    ? (tokenQueryError instanceof Error ? tokenQueryError.message : 'Token not found — check the address and chain')
    : null

  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (name && FETCH_RELEVANT_FIELDS.has(name)) {
        setFetchedTransfers(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [watch])

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
    const min = parseAmount(watchedMinTransfersSum)
    const max = parseAmount(watchedMaxTransfersSum)
    if (!min && !max) return fetchedTransfers
    return fetchedTransfers.filter((t) => {
      const amount = BigInt(t.amount)
      if (min && amount < min) return false
      if (max && amount > max) return false
      return true
    })
  }, [fetchedTransfers, watchedMinTransfersSum, watchedMaxTransfersSum, tokenData?.decimals])

  const userTransfers = useMemo(() => {
    if (!filteredTransfers || !walletAddress) return []
    return filteredTransfers.filter((t) => isAddressEqual(t.senderAddress as Address, walletAddress as Address))
  }, [filteredTransfers, walletAddress])

  const displayedTransfers = showOnlyMyTransfers ? userTransfers : (filteredTransfers ?? [])
  const userTransferCount = userTransfers.length

  const loadTransfersMutation = useLoadClaimTransfers({
    onSuccess: (data) => setFetchedTransfers(data),
  })

  const handleFetchTransfers = useCallback(async () => {
    const valid = await trigger(['tokenAddress', 'recipientAddress', 'claimMessage', 'fromDate', 'toDate'])
    if (!valid) {
      toast.error('Please fill the form correctly')
      return
    }
    if (!resolvedRecipientAddress) {
      toast.error('Please enter a valid recipient address or ENS name')
      return
    }
    const formValues = watch()
    loadTransfersMutation.mutate({
      chainId: formValues.chainId,
      tokenAddress: formValues.tokenAddress,
      recipientAddress: resolvedRecipientAddress,
      fromDate: formValues.fromDate ?? undefined,
      toDate: formValues.toDate ?? undefined,
    })
  }, [trigger, loadTransfersMutation, watch, resolvedRecipientAddress])

  const onSubmit = useCallback(async (data: CreateClaimClientInput) => {
    if (!resolvedRecipientAddress) {
      toast.error('Please enter a valid recipient address or ENS name')
      return
    }
    setLoading(true)

    try {
      const result = await createClaimAction({
        ...data,
        recipientAddress: resolvedRecipientAddress,
        fromDate: data.fromDate ?? undefined,
        toDate: data.toDate ?? undefined,
      })

      if (result?.serverError) {
        throw new Error(result.serverError)
      }

      if (result?.validationErrors) {
        toast.error('Please fix validation errors')
        return
      }

      toast.success('Claim created successfully!')
      router.push('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create claim')
    } finally {
      setLoading(false)
    }
  }, [router, resolvedRecipientAddress])

  return (
    <PageContainer>
      <div className="mb-4">
        <BackLink href="/" label="Back to Claims" />
      </div>

      <PageHeader
        title="Create Claim"
        description="Set up a verifiable transfer claim that others can prove using zero-knowledge proofs"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
        <ClaimDetailsCard
          register={register}
          error={errors.claimMessage?.message}
          charCount={watch('claimMessage').length}
        />

        <TokenInfoCard
          register={register}
          control={control}
          isFetchingToken={isFetchingToken}
          tokenData={tokenData}
          tokenError={tokenError}
          ensResolution={ensResolution}
          isResolvingEns={isResolvingEns}
          ensError={ensError}
          errors={{
            tokenAddress: errors.tokenAddress?.message,
            recipientAddress: errors.recipientAddress?.message,
          }}
        />

        <AmountConstraintsCard
          register={register}
          error={errors.maxTransfersSum?.message}
        />

        <TimeRangeCard
          control={control}
          error={errors.toDate?.message}
        />

        {displayedTransfers?.length ? (
          <TransfersPreviewCard
            transfers={displayedTransfers}
            tokenData={tokenData}
            walletAddress={walletAddress}
            chainId={watchedChainId}
            isConnected={isConnected}
            userTransferCount={userTransferCount}
            showOnlyMyTransfers={showOnlyMyTransfers}
            onToggleMyTransfers={() => setShowOnlyMyTransfers(prev => !prev)}
          />
        ) : null}

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/')} disabled={loading || loadTransfersMutation.isPending}>
            Cancel
          </Button>
          {fetchedTransfers === null ? (
            <Button type="button" onClick={handleFetchTransfers} disabled={loadTransfersMutation.isPending} className="flex-1">
              {loadTransfersMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
