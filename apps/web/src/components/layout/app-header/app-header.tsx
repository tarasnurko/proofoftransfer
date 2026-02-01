'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ConnectButton } from '@/components/layout/connect-button'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'

export default function AppHeader() {
  return (
    <header className="border-b-4 border-foreground bg-background">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-2xl font-bold uppercase tracking-tight text-foreground hover:text-accent"
          >
            PROOF OF TRANSFER
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant="outline"
                className="border-2 border-foreground bg-background px-4 py-2 font-bold uppercase hover:bg-foreground hover:text-background"
              >
                All Claims
              </Button>
            </Link>

            <Link href="/create">
              <Button
                variant="outline"
                className="border-2 border-foreground bg-background px-4 py-2 font-bold uppercase hover:bg-foreground hover:text-background"
              >
                Create Claim
              </Button>
            </Link>

            <ConnectButton />
            <ThemeSwitcher />
          </nav>
        </div>
      </div>
    </header>
  )
}
