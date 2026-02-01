'use client'

interface ErrorStateProps {
  error: string
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="border-4 border-red-500 bg-red-500/10 p-12 text-center">
      <h3 className="mb-2 text-xl font-bold uppercase text-foreground">ERROR</h3>
      <p className="text-sm text-muted-foreground">{error}</p>
    </div>
  )
}
