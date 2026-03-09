import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export type Schema = typeof schema
export type DB = PostgresJsDatabase<Schema>

export type TokenEntity = InferSelectModel<typeof schema.tokensTable>
export type InsertTokenEntity = InferInsertModel<typeof schema.tokensTable>

export type ClaimEntity = InferSelectModel<typeof schema.claimsTable>
export type InsertClaimEntity = InferInsertModel<typeof schema.claimsTable>

export type ProofEntity = InferSelectModel<typeof schema.proofsTable>
export type InsertProofEntity = InferInsertModel<typeof schema.proofsTable>

export type ProofVerificationEntity = InferSelectModel<typeof schema.proofVerificationsTable>
export type InsertProofVerificationEntity = InferInsertModel<typeof schema.proofVerificationsTable>

export type Erc20TransferEntity = InferSelectModel<typeof schema.erc20TransfersTable>
export type InsertErc20TransferEntity = InferInsertModel<typeof schema.erc20TransfersTable>

export type Erc721TransferEntity = InferSelectModel<typeof schema.erc721TransfersTable>
export type InsertErc721TransferEntity = InferInsertModel<typeof schema.erc721TransfersTable>

export type Erc1155TransferEntity = InferSelectModel<typeof schema.erc1155TransfersTable>
export type InsertErc1155TransferEntity = InferInsertModel<typeof schema.erc1155TransfersTable>

export type TransferEntity = Erc20TransferEntity | Erc721TransferEntity | Erc1155TransferEntity
export type InsertTransferEntity = InsertErc20TransferEntity | InsertErc721TransferEntity | InsertErc1155TransferEntity

export type EnsCacheEntity = InferSelectModel<typeof schema.ensCacheTable>
export type InsertEnsCacheEntity = InferInsertModel<typeof schema.ensCacheTable>
