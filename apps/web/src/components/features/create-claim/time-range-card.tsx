'use client'

import type { Control } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import type { CreateClaimClientInput } from '@/validations/claim'

interface TimeRangeCardProps {
  control: Control<CreateClaimClientInput>
  error?: string
}

export function TimeRangeCard({ control, error }: TimeRangeCardProps) {
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
                <DatePicker
                  date={field.value || undefined}
                  onSelect={(date) => field.onChange(date || null)}
                  placeholder="Select start date"
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
                <DatePicker
                  date={field.value || undefined}
                  onSelect={(date) => field.onChange(date || null)}
                  placeholder="Select end date"
                />
              )}
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Leave empty for no time constraints</p>
      </CardContent>
    </Card>
  )
}
