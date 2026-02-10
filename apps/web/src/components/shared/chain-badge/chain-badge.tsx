import { getChainName } from '@/utils/explorer.utils'
import { CHAIN_COLORS } from '@/constants'

interface ChainBadgeProps {
  chainId: number
}

export function ChainBadge({ chainId }: ChainBadgeProps) {
  const colors = CHAIN_COLORS[chainId]
  const name = getChainName(chainId)

  if (!colors) {
    return (
      <span className="inline-flex items-center border-2 border-border px-2.5 py-0.5 text-xs font-bold">
        {name}
      </span>
    )
  }

  return (
    <span className={`inline-flex w-fit items-center border-2 px-2.5 py-0.5 text-xs font-bold ${colors.bg} ${colors.text} ${colors.border}`}>
      {name}
    </span>
  )
}
