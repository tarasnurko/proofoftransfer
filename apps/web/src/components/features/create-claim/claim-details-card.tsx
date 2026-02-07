'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ClaimDetailsCardProps {
  claimMessage: string
  error?: string
  onChange: (field: string, value: string) => void
}

export function ClaimDetailsCard({ claimMessage, error, onChange }: ClaimDetailsCardProps) {
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
            value={claimMessage}
            onChange={(e) => onChange('claimMessage', e.target.value)}
            className="min-h-24"
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <p className="text-sm text-muted-foreground">{claimMessage.length} / 1000 characters</p>
        </div>
      </CardContent>
    </Card>
  )
}
