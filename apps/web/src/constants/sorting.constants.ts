import type { SortOrder } from "@/types";

export type ClaimsSortBy = "createdAt" | "proofCount";

export const CLAIMS_SORT_OPTIONS = {
  NEWEST: "createdAt-desc",
  OLDEST: "createdAt-asc",
  MOST_PROOFS: "proofCount-desc",
  LEAST_PROOFS: "proofCount-asc",
} as const;

export type ClaimsSortValue =
  (typeof CLAIMS_SORT_OPTIONS)[keyof typeof CLAIMS_SORT_OPTIONS];

export const CLAIMS_SORT_LABELS: Record<ClaimsSortValue, string> = {
  [CLAIMS_SORT_OPTIONS.NEWEST]: "Newest First",
  [CLAIMS_SORT_OPTIONS.OLDEST]: "Oldest First",
  [CLAIMS_SORT_OPTIONS.MOST_PROOFS]: "Most Proofs",
  [CLAIMS_SORT_OPTIONS.LEAST_PROOFS]: "Least Proofs",
};

export const PROOFS_SORT_OPTIONS = {
  NEWEST: "createdAt-desc",
  OLDEST: "createdAt-asc",
} as const;

export type ProofsSortValue =
  (typeof PROOFS_SORT_OPTIONS)[keyof typeof PROOFS_SORT_OPTIONS];

export const PROOFS_SORT_LABELS: Record<ProofsSortValue, string> = {
  [PROOFS_SORT_OPTIONS.NEWEST]: "Newest First",
  [PROOFS_SORT_OPTIONS.OLDEST]: "Oldest First",
};
