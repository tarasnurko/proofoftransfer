'use client'

import type { UseFormRegister, Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_CHAINS } from '@/lib/types'
import { Loader2 } from 'lucide-react'
import type { TokenEntity } from '@/db/index.types'
import type { CreateClaimClientInput } from '@/lib/validations/claim'

interface TokenInfoCardProps {
  register: UseFormRegister<CreateClaimClientInput>
  control: Control<CreateClaimClientInput>
  isFetchingToken: boolean
  tokenData: TokenEntity | null
  tokenError: string | null
  errors: { tokenAddress?: string; recipientAddress?: string }
}

export function TokenInfoCard({
  register,
  control,
  isFetchingToken,
  tokenData,
  tokenError,
  errors,
}: TokenInfoCardProps) {
  return (
    <Card className="border-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Token Information</CardTitle>
        <CardDescription>Specify the blockchain and token</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="chainId">Chain *</Label>
          <Controller
            name="chainId"
            control={control}
            render={({ field }) => (
              <Select value={field.value.toString()} onValueChange={(value) => field.onChange(Number.parseInt(value))}>
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
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tokenAddress">Token Address *</Label>
          <div className="relative">
            <Input
              id="tokenAddress"
              placeholder="0x..."
              {...register('tokenAddress')}
              className="font-mono"
            />
            {isFetchingToken ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </div>
          {errors.tokenAddress ? <p className="text-sm text-destructive">{errors.tokenAddress}</p> : null}
          {tokenError ? <p className="text-sm text-destructive">{tokenError}</p> : null}
          {tokenData ? (
            <p className="font-mono text-sm font-bold text-accent">
              {tokenData.name} ({tokenData.symbol})
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipientAddress">Recipient Address *</Label>
          <Input
            id="recipientAddress"
            placeholder="0x..."
            {...register('recipientAddress')}
            className="font-mono"
          />
          {errors.recipientAddress ? <p className="text-sm text-destructive">{errors.recipientAddress}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}
