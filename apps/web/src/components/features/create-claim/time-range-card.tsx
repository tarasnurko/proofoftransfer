'use client'

import type { Control, UseFormWatch } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import type { CreateClaimClientInput } from '@/validations/claim'

interface TimeRangeCardProps {
  control: Control<CreateClaimClientInput>
  watch: UseFormWatch<CreateClaimClientInput>
  error?: string
}

export function TimeRangeCard({ control, watch, error }: TimeRangeCardProps) {
  const chainId = watch('chainId')
  const toDate = watch('toDate')

  return (
    <Card className="border-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Time Range</CardTitle>
        <CardDescription>Optional - Set the date range for valid transfers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fromDate">Start Date</Label>
            <Controller
              name="fromDate"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  value={field.value || undefined}
                  onChange={(date) => field.onChange(date || null)}
                  placeholder="Select start date & time"
                  maxDate={toDate || new Date()}
                  chainId={chainId}
                />
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toDate">End Date</Label>
            <Controller
              name="toDate"
              control={control}
              render={({ field }) => (
                <DateTimePicker
                  value={field.value || undefined}
                  onChange={(date) => field.onChange(date || null)}
                  placeholder="Select end date & time"
                  maxDate={new Date(Date.now() - 5 * 60 * 1000)}
                  chainId={chainId}
                  clearable={false}
                />
              )}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Start date is optional. End date is always set.</p>
      </CardContent>
    </Card>
  )
}
