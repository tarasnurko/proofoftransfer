import { getClaims } from '@/db/queries/claims'
import { EnsService } from '@/services/ens'
import { ClaimsList, ITEMS_PER_PAGE } from './claims-list'
import type { ClaimsSortBy } from '@/constants'
import type { SortOrder } from '@/types'

interface ClaimsListFetcherProps {
  search?: string
  chainId?: number
  sortBy: ClaimsSortBy
  sortOrder: SortOrder
  page: number
}

export async function ClaimsListFetcher({ search, chainId, sortBy, sortOrder, page }: ClaimsListFetcherProps) {
  let resolvedSearch = search
  if (search?.endsWith('.eth')) {
    const resolved = await EnsService.resolveInput(search)
    if (resolved) {
      resolvedSearch = resolved.address
    }
  }

  const { claims, total } = await getClaims({
    search: resolvedSearch,
    chainId,
    sortBy,
    sortOrder,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  })

  const uniqueAddresses = [...new Set(claims.map((c) => c.recipientAddress))]
  const ensNames = await EnsService.batchGetEnsNames(uniqueAddresses)

  const totalPages = Math.ceil(Number(total) / ITEMS_PER_PAGE)

  return (
    <ClaimsList
      claims={claims}
      ensNames={Object.fromEntries(ensNames)}
      total={total}
      totalPages={totalPages}
      currentPage={page}
    />
  )
}
