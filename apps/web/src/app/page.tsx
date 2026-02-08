import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import {
  ClaimsResults,
  ClaimsListSkeleton,
  ClaimsPageContent,
} from "@/components/features/claims-list";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const chainId =
    typeof params.chain === "string" ? Number(params.chain) : undefined;
  const sortBy =
    typeof params.sort === "string"
      ? (params.sort as "createdAt" | "proofCount")
      : "createdAt";
  const sortOrder =
    typeof params.order === "string"
      ? (params.order as "asc" | "desc")
      : "desc";
  const page = Math.max(1, Number(params.page) || 1);

  const validChainId = chainId && !isNaN(chainId) ? chainId : undefined;

  return (
    <PageContainer>
      <PageHeader
        title="Transfer Claims"
        description="Create verifiable on-chain transfer claims using zero-knowledge proofs"
      />
      <ClaimsPageContent>
        <Suspense
          key={`${search}-${validChainId}-${sortBy}-${sortOrder}-${page}`}
          fallback={<ClaimsListSkeleton />}
        >
          <ClaimsResults
            search={search}
            chainId={validChainId}
            sortBy={sortBy}
            sortOrder={sortOrder}
            page={page}
          />
        </Suspense>
      </ClaimsPageContent>
    </PageContainer>
  );
}
