'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useConnection } from 'wagmi'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { isAddressEqual, isAddress, type Address } from 'viem'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClaimMessageCard } from './claim-message-card'
import { TokenInfoCard } from './token-info-card'
import { AmountConstraintsCard } from './amount-constraints-card'
import { TimeRangeCard } from './time-range-card'
import { TransfersPreviewCard } from './transfers-preview-card'
import { createClaimAction } from '@/actions/claims.actions'
import { useDebounce } from '@/hooks/use-debounce'
import { useGetTokenData, useLoadClaimTransfers, useResolveEns } from '@/hooks/queries'
import { createClaimClientSchema, type CreateClaimClientInput } from '@/validations/claim'
import { ChainId, TokenType } from '@repo/types'

const DEBOUNCE_MS = 500
const FETCH_RELEVANT_FIELDS = new Set(['chainId', 'tokenAddress', 'counterpartyAddress', 'isProverSender', 'tokenType', 'fromDate', 'toDate'])

export function CreateClaimForm() {
  const router = useRouter()
  const { address: walletAddress, isConnected } = useConnection()
  const [showOnlyMyTransfers, setShowOnlyMyTransfers] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<CreateClaimClientInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- @hookform/resolvers types lag behind zod v4
    resolver: zodResolver(createClaimClientSchema as any),
    defaultValues: {
      claimMessage: '',
      chainId: ChainId.ETHEREUM,
      tokenAddress: '',
      counterpartyAddress: '',
      isProverSender: true,
      tokenType: TokenType.ERC20,
      minTransfersSum: '0',
      maxTransfersSum: '0',
      minTransfersCount: 0,
      maxTransfersCount: 0,
      fromDate: null,
      toDate: new Date(),
    },
  })

  const watchedTokenAddress = watch('tokenAddress')
  const watchedChainId = watch('chainId')
  const watchedMinTransfersSum = watch('minTransfersSum')
  const watchedMaxTransfersSum = watch('maxTransfersSum')
  const watchedCounterpartyAddress = watch('counterpartyAddress')
  const watchedIsProverSender = watch('isProverSender')
  const watchedTokenType = watch('tokenType')

  const debouncedTokenAddress = useDebounce(watchedTokenAddress, DEBOUNCE_MS)
  const debouncedRecipient = useDebounce(watchedCounterpartyAddress, DEBOUNCE_MS)

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

  const loadTransfersMutation = useLoadClaimTransfers()

  const fetchedTransfers = loadTransfersMutation.data ?? null

  useEffect(() => {
    const subscription = watch((_, { name }) => {
      if (name && FETCH_RELEVANT_FIELDS.has(name)) {
        loadTransfersMutation.reset()
      }
    })
    return () => subscription.unsubscribe()
  }, [watch, loadTransfersMutation])

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
    return fetchedTransfers.filter((transfer) => {
      const rawAmount = 'amount' in transfer ? transfer.amount : '1'
      const amount = BigInt(rawAmount)
      if (min && amount < min) return false
      if (max && amount > max) return false
      return true
    })
  }, [fetchedTransfers, watchedMinTransfersSum, watchedMaxTransfersSum, tokenData?.decimals])

  const userTransfers = useMemo(() => {
    if (!filteredTransfers || !walletAddress) return []
    return filteredTransfers.filter((transfer) => {
      const field = watchedIsProverSender ? transfer.senderAddress : transfer.recipientAddress
      return isAddressEqual(field as Address, walletAddress as Address)
    })
  }, [filteredTransfers, walletAddress, watchedIsProverSender])

  const displayedTransfers = showOnlyMyTransfers ? userTransfers : (filteredTransfers ?? [])
  const userTransferCount = userTransfers.length

  const handleFetchTransfers = useCallback(async () => {
    const valid = await trigger(['tokenAddress', 'counterpartyAddress', 'claimMessage', 'fromDate', 'toDate', 'minTransfersSum', 'maxTransfersSum', 'minTransfersCount', 'maxTransfersCount'])
    if (!valid) {
      toast.error('Please fill the form correctly')
      return
    }
    if (!resolvedRecipientAddress) {
      toast.error('Please enter a valid counterparty address or ENS name')
      return
    }
    const formValues = watch()
    loadTransfersMutation.mutate({
      chainId: formValues.chainId,
      tokenAddress: formValues.tokenAddress,
      counterpartyAddress: resolvedRecipientAddress,
      isProverSender: formValues.isProverSender,
      tokenType: formValues.tokenType,
      fromDate: formValues.fromDate ?? undefined,
      toDate: formValues.toDate,
    })
  }, [trigger, loadTransfersMutation, watch, resolvedRecipientAddress])

  // ── Create Claim ─────────────────────────────────────────────
  const createClaimMutation = useMutation({
    mutationFn: async (data: CreateClaimClientInput) => {
      if (!resolvedRecipientAddress) throw new Error('Please enter a valid counterparty address or ENS name')

      const result = await createClaimAction({
        ...data,
        counterpartyAddress: resolvedRecipientAddress,
        fromDate: data.fromDate ?? undefined,
        toDate: data.toDate,
      })

      if (result?.serverError) throw new Error(result.serverError)
      if (result?.validationErrors) throw new Error('Please fix validation errors')
    },
    onSuccess: () => {
      toast.success('Claim created successfully!')
      router.push('/')
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create claim'),
  })

  const onSubmit = useCallback((data: CreateClaimClientInput) => {
    createClaimMutation.mutate(data)
  }, [createClaimMutation])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6">
      <ClaimMessageCard
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
          counterpartyAddress: errors.counterpartyAddress?.message,
        }}
      />

      <AmountConstraintsCard
        register={register}
        errors={{
          maxTransfersSum: errors.maxTransfersSum?.message,
          maxTransfersCount: errors.maxTransfersCount?.message,
        }}
      />

      <TimeRangeCard
        control={control}
        watch={watch}
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
          isProverSender={watchedIsProverSender}
        />
      ) : null}

      <div className="flex gap-4">
        <Button type="button" variant="outline" onClick={() => router.push('/')} disabled={createClaimMutation.isPending || loadTransfersMutation.isPending}>
          Cancel
        </Button>
        {fetchedTransfers === null ? (
          <Button type="button" onClick={handleFetchTransfers} disabled={loadTransfersMutation.isPending} className="flex-1">
            {loadTransfersMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Fetch Transfers
          </Button>
        ) : (
          <Button type="submit" disabled={createClaimMutation.isPending} className="flex-1">
            {createClaimMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Claim
          </Button>
        )}
      </div>
    </form>
  )
}
