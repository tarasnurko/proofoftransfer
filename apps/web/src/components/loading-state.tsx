import { Spinner } from '@/components/ui/spinner'

interface LoadingStateProps {
  message?: string
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <Spinner className="h-8 w-8" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
