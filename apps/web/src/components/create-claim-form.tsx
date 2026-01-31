'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { toast } from 'sonner'
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
import { createClaimAction } from '@/actions/claims'
import { ChainId } from '@repo/types'
import { useAccount } from 'wagmi'

export function CreateClaimForm() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
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

  const onSubmit = async (data: CreateClaimInput) => {
    setIsSubmitting(true)

    try {
      const result = await createClaimAction(data)

      if (result.success) {
        toast.success('Claim created successfully!')
        router.push('/')
      } else {
        toast.error(result.error || 'Failed to create claim')
      }
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
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
              <Input
                id="tokenAddress"
                type="text"
                placeholder="0x..."
                {...register('tokenAddress')}
                className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
              />
              {errors.tokenAddress && (
                <p className="text-sm text-red-500">{errors.tokenAddress.message}</p>
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
            disabled={isSubmitting}
            className="border-2 border-foreground bg-background px-8 py-6 font-bold uppercase hover:bg-foreground hover:text-background"
          >
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="border-2 border-foreground bg-accent px-8 py-6 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background disabled:opacity-50"
        >
          {isSubmitting ? (
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
