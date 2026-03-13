'use client'

import type { UseFormRegister } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CreateClaimClientInput } from '@/validations/claim'

interface AmountConstraintsCardProps {
  register: UseFormRegister<CreateClaimClientInput>
  errors?: { maxTransfersSum?: string; maxTransfersCount?: string }
}

export function AmountConstraintsCard({ register, errors }: AmountConstraintsCardProps) {
  return (
    <Card className="border-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Constraints</CardTitle>
        <CardDescription>Optional - Set amount and transfer count constraints</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="mb-2 block font-bold">Amount</Label>
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
              {errors?.maxTransfersSum ? <p className="text-sm text-destructive">{errors.maxTransfersSum}</p> : null}
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-2 block font-bold">Transfer Count</Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minTransfersCount">Minimum Count</Label>
              <Input
                id="minTransfersCount"
                type="number"
                min={0}
                placeholder="0"
                {...register('minTransfersCount', { valueAsNumber: true })}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxTransfersCount">Maximum Count</Label>
              <Input
                id="maxTransfersCount"
                type="number"
                min={0}
                placeholder="0"
                {...register('maxTransfersCount', { valueAsNumber: true })}
                className="font-mono"
              />
              {errors?.maxTransfersCount ? <p className="text-sm text-destructive">{errors.maxTransfersCount}</p> : null}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">Leave as 0 for no constraint</p>
      </CardContent>
    </Card>
  )
}
