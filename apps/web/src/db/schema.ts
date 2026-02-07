import { pgTable, uuid, text, varchar, bigint, integer, timestamp, jsonb, boolean, index, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const tokens = pgTable(
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

export const claims = pgTable(
  'claims',
  {
    id: uuid().primaryKey().defaultRandom(),
    message: text().notNull(),
    messageHash: varchar({ length: 78 }).notNull(),
    tokenAddress: varchar({ length: 42 }).notNull(),
    recipientAddress: varchar({ length: 42 }).notNull(),
    minTransfersSum: varchar({ length: 78 }).notNull().default('0'),
    maxTransfersSum: varchar({ length: 78 }).notNull().default('0'),
    fromBlockTimestamp: bigint({ mode: 'number' }).notNull().default(0),
    toBlockTimestamp: bigint({ mode: 'number' }).notNull().default(0),
    chainId: integer().notNull(),
    merkleRoot: varchar({ length: 78 }),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    index('message_hash_idx').on(table.messageHash),
    index('token_recipient_chain_idx').on(
      table.tokenAddress,
      table.recipientAddress,
      table.chainId
    ),
  ]
)

export const proofs = pgTable(
  'proofs',
  {
    id: uuid().primaryKey().defaultRandom(),
    claimId: uuid()
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
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

export const proofVerifications = pgTable(
  'proof_verifications',
  {
    id: uuid().primaryKey().defaultRandom(),
    proofId: uuid()
      .notNull()
      .references(() => proofs.id, { onDelete: 'cascade' }),
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

export const transfers = pgTable(
  'transfers',
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
    unique('transfers_chain_tx_log_idx').on(
      table.chainId,
      table.txHash,
      table.logIndex
    ),
    index('transfers_recipient_token_idx').on(
      table.recipientAddress,
      table.tokenAddress,
      table.chainId
    ),
    index('transfers_timestamp_idx').on(table.blockTimestamp),
  ]
)

export const claimsRelations = relations(claims, ({ many }) => ({
  proofs: many(proofs),
}))

export const proofsRelations = relations(proofs, ({ one, many }) => ({
  claim: one(claims, {
    fields: [proofs.claimId],
    references: [claims.id],
  }),
  verifications: many(proofVerifications),
}))

export const proofVerificationsRelations = relations(proofVerifications, ({ one }) => ({
  proof: one(proofs, {
    fields: [proofVerifications.proofId],
    references: [proofs.id],
  }),
}))

