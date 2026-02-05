'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CopyHashProps {
  hash: string
  chars?: number
  label?: string
}

export function CopyHash({ hash, chars = 8, label }: CopyHashProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const truncated = hash.length > chars * 2 + 2 
    ? `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}` 
    : hash

  return (
    <div className="inline-flex items-center gap-2">
      {label && <span className="font-bold">{label}</span>}
      <code className="font-mono text-sm">{truncated}</code>
      <button
        type="button"
        onClick={copyToClipboard}
        className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-secondary"
      >
        {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
      </button>
    </div>
  )
}
