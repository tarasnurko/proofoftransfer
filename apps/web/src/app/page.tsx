import { Suspense } from 'react'
import { PageContainer } from '@/components/layout/page-container'
import { PageHeader } from '@/components/shared/page-header'
import { ClaimsList, ClaimsFilters, ClaimsListSkeleton } from '@/components/features/claims-list'
import { getClaims } from '@/db/queries/claims'

const ITEMS_PER_PAGE = 10

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const search = typeof params.search === 'string' ? params.search : undefined
  const chainId = typeof params.chain === 'string' ? Number(params.chain) : undefined
  const sortBy = typeof params.sort === 'string' ? (params.sort as 'createdAt' | 'proofCount') : 'createdAt'
  const sortOrder = typeof params.order === 'string' ? (params.order as 'asc' | 'desc') : 'desc'
  const page = Math.max(1, Number(params.page) || 1)

  const { claims, total } = await getClaims({
    search,
    chainId: chainId && !isNaN(chainId) ? chainId : undefined,
    sortBy,
    sortOrder,
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
  })

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)

  return (
    <PageContainer>
      <PageHeader
        title="Transfer Claims"
        description="Create verifiable on-chain transfer claims using zero-knowledge proofs"
      />
      <div className="space-y-6">
        <ClaimsFilters />
        <Suspense key={`${search}-${chainId}-${sortBy}-${sortOrder}-${page}`} fallback={<ClaimsListSkeleton />}>
          <ClaimsList
            claims={claims}
            total={total}
            totalPages={totalPages}
            currentPage={page}
          />
        </Suspense>
      </div>
    </PageContainer>
  )
}
