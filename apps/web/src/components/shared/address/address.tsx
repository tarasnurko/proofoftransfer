'use client'

import { useState } from 'react'
import { Copy } from 'lucide-react'
import { truncateAddress } from '@/utils/format.utils'
import { getExplorerAddressUrl } from '@/utils/explorer.utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface AddressProps {
  address: string
  chars?: number
  showCopy?: boolean
  chainId?: number
}

export function Address({ address, chars = 4, showCopy = true, chainId }: AddressProps) {
  const [copied, setCopied] = useState(false)
  const explorerUrl = chainId ? getExplorerAddressUrl(chainId, address) : null

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const text = truncateAddress(address, chars)

  return (
    <span className="inline-flex items-center gap-1.5">
      {explorerUrl ? (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-sm underline decoration-1 underline-offset-2 hover:opacity-70"
        >
          {text}
        </a>
      ) : (
        <span className="font-mono text-sm">{text}</span>
      )}
      {showCopy && (
        <Tooltip open={copied}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex cursor-pointer items-center hover:opacity-70"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Copied!</TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
