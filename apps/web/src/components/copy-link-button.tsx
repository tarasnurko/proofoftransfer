'use client'

import { Link as LinkIcon, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface CopyLinkButtonProps {
  url?: string
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    const linkUrl = url || window.location.href
    await navigator.clipboard.writeText(linkUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copyToClipboard}
      className="border-2 font-bold bg-transparent"
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4 text-accent" />
          Copied!
        </>
      ) : (
        <>
          <LinkIcon className="mr-2 h-4 w-4" />
          Copy Link
        </>
      )}
    </Button>
  )
}
