import { CheckCircle2, XCircle } from 'lucide-react'
import type { VerificationStats as Stats } from '@/types'

interface VerificationStatsProps {
  stats: Stats
  size?: 'sm' | 'md'
}

export function VerificationStats({ stats, size = 'md' }: VerificationStatsProps) {
  const iconClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  const gapClass = size === 'sm' ? 'gap-0.5' : 'gap-1'
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className={`flex items-center gap-3 ${textClass} font-bold`}>
      {stats.successful > 0 && (
        <span className={`flex items-center ${gapClass} text-accent`}>
          <CheckCircle2 className={iconClass} />
          {stats.successful}{size === 'md' && ' verified'}
        </span>
      )}
      {stats.failed > 0 && (
        <span className={`flex items-center ${gapClass} text-destructive`}>
          <XCircle className={iconClass} />
          {stats.failed}{size === 'md' && ' failed'}
        </span>
      )}
    </div>
  )
}
