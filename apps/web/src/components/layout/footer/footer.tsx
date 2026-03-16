import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t-4 border-border bg-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Proof of Transfer
        </p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
            Terms of Service
          </Link>
          <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
}
