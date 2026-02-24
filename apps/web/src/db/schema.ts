import { pgTable, uuid, text, varchar, bigint, integer, timestamp, jsonb, boolean, index, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const tokensTable = pgTable(
  'tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    address: varchar({ length: 42 }).notNull(),
    chainId: integer().notNull(),
    name: text().notNull(),
    symbol: varchar({ length: 20 }).notNull(),
    decimals: integer().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique('address_chain_idx').on(table.address, table.chainId),
  ]
)

export const claimsTable = pgTable(
  'claims',
  {
    id: uuid().primaryKey().defaultRandom(),
    message: text().notNull(),
    messageHash: varchar({ length: 78 }).notNull(),
    tokenAddress: varchar({ length: 42 }).notNull(),
    counterpartyAddress: varchar({ length: 42 }).notNull(),
    isProverSender: boolean().notNull(),
    tokenType: varchar({ length: 10 }).notNull(),
    minTransfersSum: varchar({ length: 78 }).notNull().default('0'),
    maxTransfersSum: varchar({ length: 78 }).notNull().default('0'),
    minTransfersCount: integer().notNull().default(0),
    maxTransfersCount: integer().notNull().default(0),
    fromBlockTimestamp: bigint({ mode: 'number' }).notNull().default(0),
    toBlockTimestamp: bigint({ mode: 'number' }).notNull().default(0),
    chainId: integer().notNull(),
    merkleRoot: varchar({ length: 78 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index('message_hash_idx').on(table.messageHash),
    index('token_counterparty_chain_idx').on(
      table.tokenAddress,
      table.counterpartyAddress,
      table.chainId
    ),
  ]
)

export const proofsTable = pgTable(
  'proofs',
  {
    id: uuid().primaryKey().defaultRandom(),
    claimId: uuid()
      .notNull()
      .references(() => claimsTable.id, { onDelete: 'cascade' }),
    nullifier: varchar({ length: 78 }).notNull(),
    proofData: text().notNull(),
    publicInputs: jsonb().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index('claim_id_idx').on(table.claimId),
    index('nullifier_idx').on(table.nullifier),
    unique('claim_nullifier_unique').on(table.claimId, table.nullifier),
  ]
)

export const proofVerificationsTable = pgTable(
  'proof_verifications',
  {
    id: uuid().primaryKey().defaultRandom(),
    proofId: uuid()
      .notNull()
      .references(() => proofsTable.id, { onDelete: 'cascade' }),
    verifierNullifier: varchar({ length: 78 }),
    isValid: boolean().notNull(),
    verifiedAt: timestamp().notNull().defaultNow(),
    errorMessage: text(),
  },
  (table) => [
    index('proof_id_idx').on(table.proofId),
    index('is_valid_idx').on(table.isValid),
    index('proof_verifier_nullifier_idx').on(table.proofId, table.verifierNullifier),
  ]
)

export const erc20TransfersTable = pgTable(
  'erc20_transfers',
  {
    id: uuid().primaryKey().defaultRandom(),
    chainId: integer().notNull(),
    txHash: varchar({ length: 66 }).notNull(),
    logIndex: integer().notNull(),
    blockNumber: bigint({ mode: 'number' }).notNull(),
    blockTimestamp: bigint({ mode: 'number' }).notNull(),
    senderAddress: varchar({ length: 42 }).notNull(),
    recipientAddress: varchar({ length: 42 }).notNull(),
    tokenAddress: varchar({ length: 42 }).notNull(),
    amount: varchar({ length: 78 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique('erc20_transfers_chain_tx_log_idx').on(table.chainId, table.txHash, table.logIndex),
    index('erc20_transfers_recipient_token_idx').on(table.recipientAddress, table.tokenAddress, table.chainId),
    index('erc20_transfers_timestamp_idx').on(table.blockTimestamp),
  ]
)

export const erc721TransfersTable = pgTable(
  'erc721_transfers',
  {
    id: uuid().primaryKey().defaultRandom(),
    chainId: integer().notNull(),
    txHash: varchar({ length: 66 }).notNull(),
    logIndex: integer().notNull(),
    blockNumber: bigint({ mode: 'number' }).notNull(),
    blockTimestamp: bigint({ mode: 'number' }).notNull(),
    senderAddress: varchar({ length: 42 }).notNull(),
    recipientAddress: varchar({ length: 42 }).notNull(),
    tokenAddress: varchar({ length: 42 }).notNull(),
    tokenId: varchar({ length: 78 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique('erc721_transfers_chain_tx_log_idx').on(table.chainId, table.txHash, table.logIndex),
    index('erc721_transfers_recipient_token_idx').on(table.recipientAddress, table.tokenAddress, table.chainId),
    index('erc721_transfers_timestamp_idx').on(table.blockTimestamp),
  ]
)

export const erc1155TransfersTable = pgTable(
  'erc1155_transfers',
  {
    id: uuid().primaryKey().defaultRandom(),
    chainId: integer().notNull(),
    txHash: varchar({ length: 66 }).notNull(),
    logIndex: integer().notNull(),
    blockNumber: bigint({ mode: 'number' }).notNull(),
    blockTimestamp: bigint({ mode: 'number' }).notNull(),
    senderAddress: varchar({ length: 42 }).notNull(),
    recipientAddress: varchar({ length: 42 }).notNull(),
    tokenAddress: varchar({ length: 42 }).notNull(),
    tokenId: varchar({ length: 78 }).notNull(),
    amount: varchar({ length: 78 }).notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    unique('erc1155_transfers_chain_tx_log_idx').on(table.chainId, table.txHash, table.logIndex),
    index('erc1155_transfers_recipient_token_idx').on(table.recipientAddress, table.tokenAddress, table.chainId),
    index('erc1155_transfers_timestamp_idx').on(table.blockTimestamp),
  ]
)

export const claimsRelations = relations(claimsTable, ({ many }) => ({
  proofs: many(proofsTable),
}))

export const proofsRelations = relations(proofsTable, ({ one, many }) => ({
  claim: one(claimsTable, {
    fields: [proofsTable.claimId],
    references: [claimsTable.id],
  }),
  verifications: many(proofVerificationsTable),
}))

export const ensCacheTable = pgTable(
  'ens_cache',
  {
    address: varchar({ length: 42 }).primaryKey(),
    name: text(),
    expiresAt: timestamp(),
    resolvedAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index('ens_cache_name_idx').on(table.name),
  ]
)

export const proofVerificationsRelations = relations(proofVerificationsTable, ({ one }) => ({
  proof: one(proofsTable, {
    fields: [proofVerificationsTable.proofId],
    references: [proofsTable.id],
  }),
}))
