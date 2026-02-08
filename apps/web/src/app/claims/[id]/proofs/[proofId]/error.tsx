'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/page-container'
import { BackLink } from '@/components/shared/back-link'
import { AlertCircle } from 'lucide-react'

export default function ProofError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const claimId = params.id as string

  useEffect(() => {
    console.error('Proof error:', error)
  }, [error])

  return (
    <PageContainer>
      <div className="mb-4">
        <BackLink href={`/claims/${claimId}`} label="Back to Claim" />
      </div>
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Failed to load proof</h2>
          <p className="text-muted-foreground">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>
        <Button onClick={reset} className="border-4 font-bold">
          Try Again
        </Button>
      </div>
    </PageContainer>
  )
}
