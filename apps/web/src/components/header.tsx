import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { WalletButton } from '@/components/wallet-button'
import { List, Plus } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b-4 border-border bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold uppercase tracking-tight hover:opacity-80">
          Proof of Transfer
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="border-4 font-bold">
            <Link href="/">
              <List className="mr-2 h-4 w-4" />
              All Claims
            </Link>
          </Button>
          <Button asChild size="sm" className="border-4 font-bold">
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Claim
            </Link>
          </Button>
          <WalletButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
