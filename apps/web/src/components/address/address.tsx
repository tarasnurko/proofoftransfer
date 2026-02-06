'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { truncateAddress } from '@/lib/address-utils'
import { Button } from '@/components/ui/button'

interface AddressProps {
  address: string
  chars?: number
  showCopy?: boolean
}

export function Address({ address, chars = 4, showCopy = true }: AddressProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="inline-flex items-center gap-2">
      <code className="font-mono text-sm">{truncateAddress(address, chars)}</code>
      {showCopy && (
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-secondary"
        >
          {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
        </button>
      )}
    </div>
  )
}
