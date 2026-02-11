import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { tokensTable, claimsTable, proofsTable, proofVerificationsTable, transfersTable } from './schema'

export type TokenEntity = InferSelectModel<typeof tokensTable>
export type InsertTokenEntity = InferInsertModel<typeof tokensTable>

export type ClaimEntity = InferSelectModel<typeof claimsTable>
export type InsertClaimEntity = InferInsertModel<typeof claimsTable>

export type ProofEntity = InferSelectModel<typeof proofsTable>
export type InsertProofEntity = InferInsertModel<typeof proofsTable>

export type ProofVerificationEntity = InferSelectModel<typeof proofVerificationsTable>
export type InsertProofVerificationEntity = InferInsertModel<typeof proofVerificationsTable>

export type TransferEntity = InferSelectModel<typeof transfersTable>
export type InsertTransferEntity = InferInsertModel<typeof transfersTable>
