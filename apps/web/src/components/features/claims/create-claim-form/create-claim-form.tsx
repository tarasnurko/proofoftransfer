'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAction } from 'next-safe-action/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRight, Loader2 } from 'lucide-react'
import { createClaimSchema, type CreateClaimInput } from '@/lib/validations/claim'
import { createClaimAction, fetchAndStoreTokenDataAction } from '@/actions'
import { ChainId } from '@repo/types'
import { useDebounce } from '@/hooks/use-debounce'
import type { TokenEntity } from '@/db/index.types'

export function CreateClaimForm() {
  const router = useRouter()
  const [tokenAddress, setTokenAddress] = useState('')
  const [tokenData, setTokenData] = useState<TokenEntity | null>(null)
  const debouncedTokenAddress = useDebounce(tokenAddress, 500)

  const { execute, isPending } = useAction(createClaimAction, {
    onSuccess: () => {
      toast.success('Claim created successfully!')
      router.push('/')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Failed to create claim')
    },
  })

  const { execute: fetchToken, isPending: isFetchingToken } = useAction(
    fetchAndStoreTokenDataAction,
    {
      onSuccess: ({ data }) => {
        if (data?.data) {
          setTokenData(data.data)
        }
      },
      onError: () => {
        setTokenData(null)
      },
    }
  )

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateClaimInput>({
    resolver: zodResolver(createClaimSchema),
    defaultValues: {
      claimMessage: '',
      tokenAddress: '',
      recipientAddress: '',
      minTransfersSum: '0',
      maxTransfersSum: '0',
      chainId: ChainId.BASE,
    },
  })

  useEffect(() => {
    if (debouncedTokenAddress && /^0x[a-fA-F0-9]{40}$/.test(debouncedTokenAddress)) {
      const chainId = watch('chainId')
      fetchToken({
        tokenAddress: debouncedTokenAddress,
        chainId: chainId,
      })
    } else {
      setTokenData(null)
    }
  }, [debouncedTokenAddress, watch, fetchToken])

  const onSubmit = (data: CreateClaimInput) => {
    execute(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Claim Message */}
      <div className="border-4 border-foreground bg-background p-6">
        <div className="mb-6 border-b-2 border-foreground pb-2">
          <h3 className="text-xl font-bold uppercase text-foreground">CLAIM MESSAGE</h3>
        </div>
        <div className="space-y-3">
          <Label htmlFor="claimMessage" className="text-sm font-bold uppercase tracking-wide">
            Message
          </Label>
          <Textarea
            id="claimMessage"
            placeholder="Have you transferred at least 100 USDC to Alice in the previous week?"
            {...register('claimMessage')}
            rows={3}
            className="resize-none border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
          />
          {errors.claimMessage && (
            <p className="text-sm text-red-500">{errors.claimMessage.message}</p>
          )}
        </div>
      </div>

      {/* Token and Recipient */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="border-4 border-foreground bg-background p-6">
          <div className="mb-6 border-b-2 border-foreground pb-2">
            <h3 className="text-xl font-bold uppercase text-foreground">TOKEN</h3>
          </div>
          <div className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="chainId" className="text-sm font-bold uppercase tracking-wide">
                Blockchain
              </Label>
              <Controller
                name="chainId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <SelectTrigger className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0">
                      <SelectValue placeholder="Select blockchain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ChainId.ETHEREUM.toString()}>Ethereum</SelectItem>
                      <SelectItem value={ChainId.OPTIMISM.toString()}>Optimism</SelectItem>
                      <SelectItem value={ChainId.BNB.toString()}>BNB Chain</SelectItem>
                      <SelectItem value={ChainId.POLYGON.toString()}>Polygon</SelectItem>
                      <SelectItem value={ChainId.BASE.toString()}>Base</SelectItem>
                      <SelectItem value={ChainId.ARBITRUM.toString()}>Arbitrum</SelectItem>
                      <SelectItem value={ChainId.SCROLL.toString()}>Scroll</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.chainId && (
                <p className="text-sm text-red-500">{errors.chainId.message}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="tokenAddress" className="text-sm font-bold uppercase tracking-wide">
                Token Address
              </Label>
              <div className="relative">
                <Input
                  id="tokenAddress"
                  type="text"
                  placeholder="0x..."
                  {...register('tokenAddress')}
                  onChange={(e) => {
                    register('tokenAddress').onChange(e)
                    setTokenAddress(e.target.value)
                  }}
                  className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
                />
                {isFetchingToken && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {errors.tokenAddress && (
                <p className="text-sm text-red-500">{errors.tokenAddress.message}</p>
              )}
              {tokenData && (
                <div className="rounded border-2 border-accent bg-accent/10 px-3 py-2">
                  <p className="font-mono text-sm font-bold">
                    {tokenData.name} ({tokenData.symbol})
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="recipientAddress" className="text-sm font-bold uppercase tracking-wide">
                Recipient
              </Label>
              <Input
                id="recipientAddress"
                type="text"
                placeholder="0x..."
                {...register('recipientAddress')}
                className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
              />
              {errors.recipientAddress && (
                <p className="text-sm text-red-500">{errors.recipientAddress.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Amount Constraints */}
        <div className="border-4 border-foreground bg-background p-6">
          <div className="mb-6 border-b-2 border-foreground pb-2">
            <h3 className="text-xl font-bold uppercase text-foreground">AMOUNT</h3>
          </div>
          <div className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="minTransfersSum" className="text-sm font-bold uppercase tracking-wide">
                Min <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="minTransfersSum"
                type="text"
                placeholder="0"
                {...register('minTransfersSum')}
                className="border-2 border-foreground bg-background font-mono focus:border-accent focus:ring-0"
              />
              {errors.minTransfersSum && (
                <p className="text-sm text-red-500">{errors.minTransfersSum.message}</p>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="maxTransfersSum" className="text-sm font-bold uppercase tracking-wide">
                Max <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="maxTransfersSum"
                type="text"
                placeholder="0"
                {...register('maxTransfersSum')}
                className="border-2 border-foreground bg-background font-mono focus:border-accent focus:ring-0"
              />
              {errors.maxTransfersSum && (
                <p className="text-sm text-red-500">{errors.maxTransfersSum.message}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Time Constraints */}
      <div className="border-4 border-foreground bg-background p-6">
        <div className="mb-6 border-b-2 border-foreground pb-2">
          <h3 className="text-xl font-bold uppercase text-foreground">TIME RANGE</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-wide">
              From Date <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Controller
              name="fromDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select start date"
                  disableFuture
                />
              )}
            />
            {errors.fromDate && (
              <p className="text-sm text-red-500">{errors.fromDate.message}</p>
            )}
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-bold uppercase tracking-wide">
              To Date <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Controller
              name="toDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select end date"
                  disableFuture
                />
              )}
            />
            {errors.toDate && (
              <p className="text-sm text-red-500">{errors.toDate.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4">
        <Link href="/">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            className="border-2 border-foreground bg-background px-8 py-6 font-bold uppercase hover:bg-foreground hover:text-background"
          >
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={isPending}
          className="border-2 border-foreground bg-accent px-8 py-6 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
