import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 space-y-2 border-b-4 border-border pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-balance text-2xl font-bold uppercase tracking-tight sm:text-4xl">{title}</h1>
        {actions}
      </div>
      {description && (
        <p className="text-pretty text-lg text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
