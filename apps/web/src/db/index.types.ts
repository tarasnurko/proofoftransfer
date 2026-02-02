import { tokens, claims, proofs, proofVerifications } from './schema'

export type TokenEntity = typeof tokens.$inferSelect
export type InsertTokenEntity = typeof tokens.$inferInsert

export type ClaimEntity = typeof claims.$inferSelect
export type InsertClaimEntity = typeof claims.$inferInsert

export type ProofEntity = typeof proofs.$inferSelect
export type InsertProofEntity = typeof proofs.$inferInsert

export type ProofVerificationEntity = typeof proofVerifications.$inferSelect
export type InsertProofVerificationEntity = typeof proofVerifications.$inferInsert
