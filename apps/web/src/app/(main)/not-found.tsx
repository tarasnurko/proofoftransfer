import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageContainer } from '@/components/layout/page-container'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <PageContainer>
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="w-full max-w-md border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(200,200,200,0.3)]">
          <CardContent className="flex flex-col items-center gap-6 p-8">
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
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
