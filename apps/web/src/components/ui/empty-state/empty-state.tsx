'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  message: string
  action?: ReactNode
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="border-4 border-foreground bg-background p-12 text-center">
      <h3 className="mb-2 text-xl font-bold uppercase text-foreground">{title}</h3>
      <p className="mb-6 text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  )
}
