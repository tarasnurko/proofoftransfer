'use client'

import { Link as LinkIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

interface CopyLinkButtonProps {
  url?: string
}

export function CopyLinkButton({ url }: CopyLinkButtonProps) {
  const { copied, copy } = useCopyToClipboard(2000)

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copy(url || window.location.href)}
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
