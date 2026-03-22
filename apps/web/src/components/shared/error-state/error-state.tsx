import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface ErrorStateProps {
  title?: string
  message: string
}

export function ErrorState({ title = 'Error', message }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="border-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
