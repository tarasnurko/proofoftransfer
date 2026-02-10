import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import {
  ClaimsResults,
  ClaimsListSkeleton,
  ClaimsPageContent,
} from "@/components/features/claims-list";
import { parseClaimsSearchParams } from "@/utils/claims.utils";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { search, chainId, sortBy, sortOrder, page } =
    parseClaimsSearchParams(await searchParams);

  return (
    <PageContainer>
      <PageHeader
        title="Transfer Claims"
        description="Create verifiable on-chain transfer claims using zero-knowledge proofs"
      />
      <ClaimsPageContent>
        <Suspense
          key={`${search}-${chainId}-${sortBy}-${sortOrder}-${page}`}
          fallback={<ClaimsListSkeleton />}
        >
          <ClaimsResults
            search={search}
            chainId={chainId}
            sortBy={sortBy}
            sortOrder={sortOrder}
            page={page}
          />
        </Suspense>
      </ClaimsPageContent>
    </PageContainer>
  );
}
