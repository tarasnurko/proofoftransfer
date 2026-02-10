import { getClaims } from '@/db/queries/claims'
import { ClaimsList } from './claims-list'
import type { ClaimsSortBy } from '@/constants'
import type { SortOrder } from '@/types'

const ITEMS_PER_PAGE = 10

interface ClaimsResultsProps {
  search?: string
  chainId?: number
  sortBy: ClaimsSortBy
  sortOrder: SortOrder
  page: number
}

export async function ClaimsResults({ search, chainId, sortBy, sortOrder, page }: ClaimsResultsProps) {
  const { claims, total } = await getClaims({
    search,
    chainId,
    sortBy,
    sortOrder,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  })

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <ClaimsList
      claims={claims}
      total={total}
      totalPages={totalPages}
      currentPage={page}
    />
  )
}
