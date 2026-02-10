'use client'

import type { UseFormRegister } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CreateClaimClientInput } from '@/validations/claim'

interface AmountConstraintsCardProps {
  register: UseFormRegister<CreateClaimClientInput>
  error?: string
}

export function AmountConstraintsCard({ register, error }: AmountConstraintsCardProps) {
  return (
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
              {...register('minTransfersSum')}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxTransfersSum">Maximum Amount</Label>
            <Input
              id="maxTransfersSum"
              placeholder="0"
              {...register('maxTransfersSum')}
              className="font-mono"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Leave as 0 for no constraint</p>
      </CardContent>
    </Card>
  )
}
