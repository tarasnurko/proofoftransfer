'use client'

import type { UseFormRegister } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CreateClaimClientInput } from '@/validations/claim'

interface ClaimMessageCardProps {
  register: UseFormRegister<CreateClaimClientInput>
  error?: string
  charCount: number
}

export function ClaimMessageCard({ register, error, charCount }: ClaimMessageCardProps) {
  return (
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
            {...register('claimMessage')}
            className="min-h-24"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <p className="text-sm text-muted-foreground">{charCount} / 1000 characters</p>
        </div>
      </CardContent>
    </Card>
  )
}
