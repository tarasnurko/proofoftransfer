'use client'

import { WalletConnect } from './wallet-connect'
import { ChangeThemeButton } from './change-theme-button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-black">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Transfer Prover</h1>
        </div>

        <div className="flex items-center gap-4">
          <WalletConnect />
          <ChangeThemeButton />
        </div>
      </div>
    </header>
  )
}
