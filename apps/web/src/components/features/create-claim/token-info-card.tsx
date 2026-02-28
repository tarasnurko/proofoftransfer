'use client'

import type { UseFormRegister, Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_CHAINS } from '@/constants'
import { Loader2 } from 'lucide-react'
import { Address } from '@/components/shared/address'
import type { TokenEntity } from '@/db/index.types'
import { TokenType } from '@repo/types'
import type { CreateClaimClientInput } from '@/validations/claim'
import type { Nullable } from '@/types/common.types'
import type { EnsResolution } from '@/types/blockchain.types'

interface TokenInfoCardProps {
  register: UseFormRegister<CreateClaimClientInput>
  control: Control<CreateClaimClientInput>
  isFetchingToken: boolean
  tokenData: Nullable<TokenEntity>
  tokenError: Nullable<string>
  ensResolution: Nullable<EnsResolution>
  isResolvingEns: boolean
  ensError: Nullable<string>
  errors: { tokenAddress?: string; counterpartyAddress?: string }
}

export function TokenInfoCard({
  register,
  control,
  isFetchingToken,
  tokenData,
  tokenError,
  ensResolution,
  isResolvingEns,
  ensError,
  errors,
}: TokenInfoCardProps) {
  return (
    <Card className="border-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Token Information</CardTitle>
        <CardDescription>Specify the blockchain and token</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
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
            <Label htmlFor="tokenType">Token Type *</Label>
            <Controller
              name="tokenType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TokenType.ERC20}>ERC-20</SelectItem>
                    <SelectItem value={TokenType.ERC721}>ERC-721</SelectItem>
                    <SelectItem value={TokenType.ERC1155}>ERC-1155</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
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
          <Label htmlFor="counterpartyAddress">Counterparty Address *</Label>
          <div className="relative">
            <Input
              id="counterpartyAddress"
              placeholder="0x... or name.eth"
              {...register('counterpartyAddress')}
              className="font-mono"
            />
            {isResolvingEns ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </div>
          {errors.counterpartyAddress ? <p className="text-sm text-destructive">{errors.counterpartyAddress}</p> : null}
          {ensError ? <p className="text-sm text-destructive">{ensError}</p> : null}
          {ensResolution?.ensName ? (
            <Address address={ensResolution.address} chars={6} />
          ) : null}
        </div>

        <div className="max-w-xs space-y-2">
          <Label htmlFor="isProverSender">Prover Role *</Label>
          <Controller
            name="isProverSender"
            control={control}
            render={({ field }) => (
              <Select value={field.value ? 'sender' : 'recipient'} onValueChange={(v) => field.onChange(v === 'sender')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sender">I am the Sender</SelectItem>
                  <SelectItem value="recipient">I am the Recipient</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-xs text-muted-foreground">
            Whether the prover sent or received the transfers
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
