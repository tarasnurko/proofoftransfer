'use client'

import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="border-4 border-foreground bg-background p-12 text-center">
      <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent" />
      <p className="mt-4 font-bold uppercase text-muted-foreground">{message}</p>
    </div>
  )
}
