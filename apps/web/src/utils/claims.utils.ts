import { PROOFS_SORT_OPTIONS } from '@/constants'
import type { ClaimsSortBy } from '@/constants'
import type { SortOrder } from '@/types'

export function parseClaimsSort(value: string): { sortBy: ClaimsSortBy; sortOrder: SortOrder } {
  const [sortBy, sortOrder] = value.split('-') as [string, string]
  return {
    sortBy: sortBy === 'proofCount' ? 'proofCount' : 'createdAt',
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
  }
}

export function parseClaimsSearchParams(
  params: Record<string, string | string[] | undefined>
): { search?: string; chainId?: number; sortBy: ClaimsSortBy; sortOrder: SortOrder; page: number } {
  const search = typeof params.search === 'string' ? params.search : undefined
  const rawChain = typeof params.chain === 'string' ? Number(params.chain) : NaN
  const chainId = !isNaN(rawChain) ? rawChain : undefined
  const { sortBy, sortOrder } = parseClaimsSort(
    `${typeof params.sort === 'string' ? params.sort : 'createdAt'}-${typeof params.order === 'string' ? params.order : 'desc'}`
  )
  const page = Math.max(1, Number(params.page) || 1)

  return { search, chainId, sortBy, sortOrder, page }
}

export function parseProofsSort(value: string): SortOrder {
  return value === PROOFS_SORT_OPTIONS.OLDEST ? 'asc' : 'desc'
}
