'use client'

import { useParams } from 'next/navigation'
import { ErrorPage } from '@/components/shared/error-page'

export default function ProofError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const claimId = params.id as string

  return (
    <ErrorPage
      title="Something went wrong"
      backHref={`/claims/${claimId}`}
      backLabel="Back to Claim"
      error={error}
      reset={reset}
    />
  )
}
