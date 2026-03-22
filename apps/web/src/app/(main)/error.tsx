'use client'

import { ErrorPage } from '@/components/shared/error-page'

export default function GlobalError({
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
      backLabel="Home"
      error={error}
      reset={reset}
    />
  )
}
