'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowRight } from 'lucide-react'

export function CreateClaimForm() {
  const [formData, setFormData] = useState({
    claimMessage: '',
    tokenAddress: '',
    recipientAddress: '',
    minTransfersSum: '',
    maxTransfersSum: '',
    fromBlockTimestamp: '',
    toBlockTimestamp: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Claim form submitted:', formData)
    // TODO: Implement claim creation logic
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
            value={formData.claimMessage}
            onChange={(e) => handleChange('claimMessage', e.target.value)}
            required
            rows={3}
            className="resize-none border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="border-4 border-foreground bg-background p-6">
          <div className="mb-6 border-b-2 border-foreground pb-2">
            <h3 className="text-xl font-bold uppercase text-foreground">TOKEN</h3>
          </div>
          <div className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="tokenAddress" className="text-sm font-bold uppercase tracking-wide">
                Token Address
              </Label>
              <Input
                id="tokenAddress"
                type="text"
                placeholder="0x..."
                value={formData.tokenAddress}
                onChange={(e) => handleChange('tokenAddress', e.target.value)}
                required
                className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="recipientAddress" className="text-sm font-bold uppercase tracking-wide">
                Recipient
              </Label>
              <Input
                id="recipientAddress"
                type="text"
                placeholder="0x..."
                value={formData.recipientAddress}
                onChange={(e) => handleChange('recipientAddress', e.target.value)}
                required
                className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
              />
            </div>
          </div>
        </div>

        <div className="border-4 border-foreground bg-background p-6">
          <div className="mb-6 border-b-2 border-foreground pb-2">
            <h3 className="text-xl font-bold uppercase text-foreground">AMOUNT</h3>
          </div>
          <div className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="minTransfersSum" className="text-sm font-bold uppercase tracking-wide">
                Min
              </Label>
              <Input
                id="minTransfersSum"
                type="number"
                placeholder="0"
                value={formData.minTransfersSum}
                onChange={(e) => handleChange('minTransfersSum', e.target.value)}
                min="0"
                step="any"
                className="border-2 border-foreground bg-background font-mono focus:border-accent focus:ring-0"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="maxTransfersSum" className="text-sm font-bold uppercase tracking-wide">
                Max
              </Label>
              <Input
                id="maxTransfersSum"
                type="number"
                placeholder="0"
                value={formData.maxTransfersSum}
                onChange={(e) => handleChange('maxTransfersSum', e.target.value)}
                min="0"
                step="any"
                className="border-2 border-foreground bg-background font-mono focus:border-accent focus:ring-0"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-4 border-foreground bg-background p-6">
        <div className="mb-6 border-b-2 border-foreground pb-2">
          <h3 className="text-xl font-bold uppercase text-foreground">TIME</h3>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label htmlFor="fromBlockTimestamp" className="text-sm font-bold uppercase tracking-wide">
              From
            </Label>
            <Input
              id="fromBlockTimestamp"
              type="number"
              placeholder="0"
              value={formData.fromBlockTimestamp}
              onChange={(e) => handleChange('fromBlockTimestamp', e.target.value)}
              min="0"
              className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
            />
          </div>
          <div className="space-y-3">
            <Label htmlFor="toBlockTimestamp" className="text-sm font-bold uppercase tracking-wide">
              To
            </Label>
            <Input
              id="toBlockTimestamp"
              type="number"
              placeholder="0"
              value={formData.toBlockTimestamp}
              onChange={(e) => handleChange('toBlockTimestamp', e.target.value)}
              min="0"
              className="border-2 border-foreground bg-background font-mono text-sm focus:border-accent focus:ring-0"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Link href="/">
          <Button
            type="button"
            variant="outline"
            className="border-2 border-foreground bg-background px-8 py-6 font-bold uppercase hover:bg-foreground hover:text-background"
          >
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          className="border-2 border-foreground bg-accent px-8 py-6 font-bold uppercase text-accent-foreground hover:bg-foreground hover:text-background"
        >
          Create <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </form>
  )
}
