export const QUERY_KEYS = {
  claims: {
    all: ['claims'] as const,
    list: () => [...QUERY_KEYS.claims.all, 'list'] as const,
    detail: (id: string) => [...QUERY_KEYS.claims.all, 'detail', id] as const,
  },
  proofs: {
    all: ['proofs'] as const,
    byClaimId: (claimId: string) => [...QUERY_KEYS.proofs.all, 'byClaimId', claimId] as const,
    detail: (id: string) => [...QUERY_KEYS.proofs.all, 'detail', id] as const,
    verificationStats: (proofId: string) => [...QUERY_KEYS.proofs.all, 'verificationStats', proofId] as const,
  },
} as const
