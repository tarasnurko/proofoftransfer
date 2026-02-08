'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageContainer } from '@/components/layout/page-container'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Link from 'next/link'

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
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="w-full max-w-md border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(200,200,200,0.3)]">
          <CardContent className="flex flex-col items-center gap-6 p-8">
            <div className="flex h-20 w-20 items-center justify-center border-4 border-destructive bg-destructive/10">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>

            <div className="text-center">
              <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                {error.message || 'An unexpected error occurred'}
              </p>
            </div>

            <div className="flex w-full gap-3">
              <Button onClick={reset} className="flex-1 gap-2 border-4 font-bold">
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
              <Button asChild variant="outline" className="flex-1 gap-2 border-4 font-bold">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
