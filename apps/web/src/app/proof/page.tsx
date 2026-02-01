'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function ProofPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const claimId = searchParams.get('claim')

  useEffect(() => {
    if (claimId) {
      // Redirect to claim details page
      router.replace(`/claims/${claimId}`)
    } else {
      // No claim ID, redirect to home
      router.replace('/')
    }
  }, [claimId, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-accent" />
    </div>
  )
}
