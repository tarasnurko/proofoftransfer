'use client'

import { ErrorPage } from '@/components/shared/error-page'

export default function ClaimError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorPage
      title="Something went wrong"
      backHref="/"
      backLabel="Back to Claims"
      error={error}
      reset={reset}
    />
  )
}
