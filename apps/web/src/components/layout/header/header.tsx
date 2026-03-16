import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { WalletButton } from '@/components/shared/wallet-button'
import { List, Plus, BookOpen, Github } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL

export function Header() {
  return (
    <header className="border-b-4 border-border bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold uppercase tracking-tight hover:opacity-80">
          Proof of Transfer
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <List className="mr-2 h-4 w-4" />
              All Claims
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Claim
            </Link>
          </Button>
          {docsUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild variant="outline" size="icon" className="h-9 w-9">
                  <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Documentation</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild variant="outline" size="icon" className="h-9 w-9">
                <a href="https://github.com/tarasnurko/transferproover" target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>GitHub</TooltipContent>
          </Tooltip>
          <WalletButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
