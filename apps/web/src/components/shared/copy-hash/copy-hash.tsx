'use client'

import { Copy } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

interface CopyHashProps {
  hash: string
  chars?: number
  label?: string
}

export function CopyHash({ hash, chars = 8, label }: CopyHashProps) {
  const { copied, copy } = useCopyToClipboard()

  const truncated = chars > 0
    ? (hash.length > chars * 2 + 2 ? `${hash.slice(0, chars + 2)}...${hash.slice(-chars)}` : hash)
    : null

  return (
    <span className="inline-flex items-center gap-1.5">
      {label && <span className="font-bold">{label}</span>}
      {truncated && <code className="font-mono text-sm">{truncated}</code>}
      <Tooltip open={copied}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => copy(hash)}
            className="inline-flex cursor-pointer items-center hover:opacity-70"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>Copied!</TooltipContent>
      </Tooltip>
    </span>
  )
}
