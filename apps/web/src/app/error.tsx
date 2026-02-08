'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/layout/page-container'
import { AlertCircle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center gap-6 py-16">
        <AlertCircle className="h-16 w-16 text-destructive" />
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
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
