'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageContainer } from '@/components/page-container'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SUPPORTED_CHAINS } from '@/lib/types'
import { isValidAddress } from '@/lib/address-utils'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClaimAction } from '@/actions/claims.actions'

export default function CreateClaimPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    claimMessage: '',
    chainId: 8453,
    tokenAddress: '',
    recipientAddress: '',
    minTransfersSum: '0',
    maxTransfersSum: '0',
    fromDate: null as Date | null,
    toDate: null as Date | null,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (field: string, value: string | number | Date | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.claimMessage || formData.claimMessage.length < 10) {
      newErrors.claimMessage = 'Message must be at least 10 characters'
    }
    if (formData.claimMessage.length > 1000) {
      newErrors.claimMessage = 'Message must be less than 1000 characters'
    }

    if (!isValidAddress(formData.tokenAddress)) {
      newErrors.tokenAddress = 'Invalid token address'
    }

    if (!isValidAddress(formData.recipientAddress)) {
      newErrors.recipientAddress = 'Invalid recipient address'
    }

    if (formData.minTransfersSum && formData.maxTransfersSum) {
      const min = BigInt(formData.minTransfersSum)
      const max = BigInt(formData.maxTransfersSum)
      if (max < min && max > 0n) {
        newErrors.maxTransfersSum = 'Maximum must be greater than minimum'
      }
    }

    if (formData.fromDate && formData.toDate) {
      if (formData.toDate <= formData.fromDate) {
        newErrors.toDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return !Object.keys(newErrors).length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors in the form')
      return
    }

    setLoading(true)

    try {
      const result = await createClaimAction({
        ...formData,
        fromDate: formData.fromDate ?? undefined,
        toDate: formData.toDate ?? undefined,
      })

      if (result?.serverError) {
        throw new Error(result.serverError)
      }

      if (result?.validationErrors) {
        const validationErrors: Record<string, string> = {}
        Object.entries(result.validationErrors).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            validationErrors[key] = value[0] || 'Invalid value'
          }
        })
        setErrors(validationErrors)
        toast.error('Please fix the errors in the form')
        return
      }

      toast.success('Claim created successfully!')
      router.push('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create claim')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer>
      <Link href="/" className="mb-4 inline-flex items-center text-sm hover:opacity-80">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Claims
      </Link>

      <div className="mb-8 space-y-2 border-b-4 border-border pb-6">
        <h1 className="text-balance text-4xl font-bold uppercase tracking-tight">Create Claim</h1>
        <p className="text-pretty text-lg text-muted-foreground">
          Set up a verifiable transfer claim that others can prove using zero-knowledge proofs
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
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
                value={formData.claimMessage}
                onChange={(e) => handleChange('claimMessage', e.target.value)}
                className="min-h-24 border-2"
              />
              {errors.claimMessage && <p className="text-sm text-destructive">{errors.claimMessage}</p>}
              <p className="text-sm text-muted-foreground">{formData.claimMessage.length} / 1000 characters</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Token Information</CardTitle>
            <CardDescription>Specify the blockchain and token</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chainId">Chain *</Label>
              <Select value={formData.chainId.toString()} onValueChange={(value) => handleChange('chainId', Number.parseInt(value))}>
                <SelectTrigger className="border-2">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenAddress">Token Address *</Label>
              <Input
                id="tokenAddress"
                placeholder="0x..."
                value={formData.tokenAddress}
                onChange={(e) => handleChange('tokenAddress', e.target.value)}
                className="border-2 font-mono"
              />
              {errors.tokenAddress && <p className="text-sm text-destructive">{errors.tokenAddress}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientAddress">Recipient Address *</Label>
              <Input
                id="recipientAddress"
                placeholder="0x..."
                value={formData.recipientAddress}
                onChange={(e) => handleChange('recipientAddress', e.target.value)}
                className="border-2 font-mono"
              />
              {errors.recipientAddress && <p className="text-sm text-destructive">{errors.recipientAddress}</p>}
            </div>
          </CardContent>
        </Card>

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
                  type="number"
                  placeholder="0"
                  value={formData.minTransfersSum}
                  onChange={(e) => handleChange('minTransfersSum', e.target.value)}
                  className="border-2"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTransfersSum">Maximum Amount</Label>
                <Input
                  id="maxTransfersSum"
                  type="number"
                  placeholder="0"
                  value={formData.maxTransfersSum}
                  onChange={(e) => handleChange('maxTransfersSum', e.target.value)}
                  className="border-2"
                  min="0"
                />
                {errors.maxTransfersSum && <p className="text-sm text-destructive">{errors.maxTransfersSum}</p>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Leave as 0 for no constraint</p>
          </CardContent>
        </Card>

        <Card className="border-4">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Time Range</CardTitle>
            <CardDescription>Optional - Set the date range for valid transfers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromDate">Start Date</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={formData.fromDate ? formData.fromDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('fromDate', e.target.value ? new Date(e.target.value) : null)}
                  className="border-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="toDate">End Date</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={formData.toDate ? formData.toDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleChange('toDate', e.target.value ? new Date(e.target.value) : null)}
                  className="border-2"
                />
                {errors.toDate && <p className="text-sm text-destructive">{errors.toDate}</p>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Leave empty for no time constraints</p>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => router.push('/')} disabled={loading} className="border-4 font-bold">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 border-4 font-bold">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Claim
          </Button>
        </div>
      </form>
    </PageContainer>
  )
}
