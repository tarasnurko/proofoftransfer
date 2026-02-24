import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { tokensTable, claimsTable, proofsTable, proofVerificationsTable, erc20TransfersTable, erc721TransfersTable, erc1155TransfersTable, ensCacheTable } from './schema'

export type TokenEntity = InferSelectModel<typeof tokensTable>
export type InsertTokenEntity = InferInsertModel<typeof tokensTable>

export type ClaimEntity = InferSelectModel<typeof claimsTable>
export type InsertClaimEntity = InferInsertModel<typeof claimsTable>

export type ProofEntity = InferSelectModel<typeof proofsTable>
export type InsertProofEntity = InferInsertModel<typeof proofsTable>

export type ProofVerificationEntity = InferSelectModel<typeof proofVerificationsTable>
export type InsertProofVerificationEntity = InferInsertModel<typeof proofVerificationsTable>

export type Erc20TransferEntity = InferSelectModel<typeof erc20TransfersTable>
export type InsertErc20TransferEntity = InferInsertModel<typeof erc20TransfersTable>

export type Erc721TransferEntity = InferSelectModel<typeof erc721TransfersTable>
export type InsertErc721TransferEntity = InferInsertModel<typeof erc721TransfersTable>

export type Erc1155TransferEntity = InferSelectModel<typeof erc1155TransfersTable>
export type InsertErc1155TransferEntity = InferInsertModel<typeof erc1155TransfersTable>

export type TransferEntity = Erc20TransferEntity | Erc721TransferEntity | Erc1155TransferEntity
export type InsertTransferEntity = InsertErc20TransferEntity | InsertErc721TransferEntity | InsertErc1155TransferEntity

export type EnsCacheEntity = InferSelectModel<typeof ensCacheTable>
export type InsertEnsCacheEntity = InferInsertModel<typeof ensCacheTable>
