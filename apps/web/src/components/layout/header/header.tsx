'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { WalletButton } from '@/components/shared/wallet-button'
import { List, Plus, BookOpen, Github, Menu, X } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      <header className="sticky top-0 z-50 border-b-4 border-border bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold uppercase tracking-tight hover:opacity-80">
            Proof of Transfer
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-2 md:flex">
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

          {/* Mobile hamburger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Toggle menu"
            className="md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Mobile overlay + dropdown */}
      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-40 flex flex-col md:hidden" onClick={() => setMobileOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
          {/* Menu — vertically centered in remaining space */}
          <div className="relative flex flex-1 items-center justify-center px-4" onClick={e => e.stopPropagation()}>
            <nav className="flex w-full max-w-sm flex-col gap-3">
              <Button asChild variant="outline" size="sm" className="w-full justify-center">
                <Link href="/">
                  <List className="mr-2 h-4 w-4" />
                  All Claims
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-center">
                <Link href="/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Claim
                </Link>
              </Button>
              <div className="flex gap-2">
                {docsUrl && (
                  <Button asChild variant="outline" size="sm" className="flex-1 justify-center">
                    <a href={docsUrl} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Docs
                    </a>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="flex-1 justify-center">
                  <a href="https://github.com/tarasnurko/transferproover" target="_blank" rel="noopener noreferrer">
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </a>
                </Button>
              </div>
              <div className="flex items-center justify-center gap-2 border-t-2 border-border pt-3">
                <WalletButton />
                <ThemeToggle />
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
