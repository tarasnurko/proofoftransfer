import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="container mx-auto flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(200,200,200,0.3)]">
        <div className="flex flex-col items-center gap-6 p-8">
          <div className="flex h-20 w-20 items-center justify-center border-4 border-muted-foreground bg-muted">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>

          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold">Page Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist
            </p>
          </div>

          <Button asChild className="w-full gap-2 border-4 font-bold">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
