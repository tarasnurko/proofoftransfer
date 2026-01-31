import { pgTable, uuid, text, varchar, bigint, integer, timestamp, jsonb, boolean, index, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Claims table
export const claims = pgTable(
  'claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    message: text('message').notNull(),
    message_hash: varchar('message_hash', { length: 78 }).notNull(),
    token_address: varchar('token_address', { length: 42 }).notNull(),
    recipient_address: varchar('recipient_address', { length: 42 }).notNull(),
    min_transfers_sum: varchar('min_transfers_sum', { length: 78 }).notNull().default('0'),
    max_transfers_sum: varchar('max_transfers_sum', { length: 78 }).notNull().default('0'),
    from_block_timestamp: bigint('from_block_timestamp', { mode: 'number' }).notNull().default(0),
    to_block_timestamp: bigint('to_block_timestamp', { mode: 'number' }).notNull().default(0),
    chain_id: integer('chain_id').notNull(),
    creator_address: varchar('creator_address', { length: 42 }).notNull(),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    messageHashIdx: index('message_hash_idx').on(table.message_hash),
    tokenRecipientChainIdx: index('token_recipient_chain_idx').on(
      table.token_address,
      table.recipient_address,
      table.chain_id
    ),
    creatorIdx: index('creator_idx').on(table.creator_address),
  })
)

// Proofs table
export const proofs = pgTable(
  'proofs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    claim_id: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    nullifier: varchar('nullifier', { length: 78 }).notNull(),
    proof_data: text('proof_data').notNull(),
    public_inputs: jsonb('public_inputs').notNull(),
    transfers_root_hash: varchar('transfers_root_hash', { length: 78 }).notNull(),
    prover_address: varchar('prover_address', { length: 42 }),
    created_at: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    claimIdIdx: index('claim_id_idx').on(table.claim_id),
    nullifierIdx: index('nullifier_idx').on(table.nullifier),
    proverAddressIdx: index('prover_address_idx').on(table.prover_address),
    claimNullifierUnique: unique('claim_nullifier_unique').on(table.claim_id, table.nullifier),
  })
)

// Proof verifications table
export const proof_verifications = pgTable(
  'proof_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    proof_id: uuid('proof_id')
      .notNull()
      .references(() => proofs.id, { onDelete: 'cascade' }),
    verifier_address: varchar('verifier_address', { length: 42 }),
    is_valid: boolean('is_valid').notNull(),
    verified_at: timestamp('verified_at').notNull().defaultNow(),
    error_message: text('error_message'),
  },
  (table) => ({
    proofIdIdx: index('proof_id_idx').on(table.proof_id),
    isValidIdx: index('is_valid_idx').on(table.is_valid),
  })
)

// Relations
export const claimsRelations = relations(claims, ({ many }) => ({
  proofs: many(proofs),
}))

export const proofsRelations = relations(proofs, ({ one, many }) => ({
  claim: one(claims, {
    fields: [proofs.claim_id],
    references: [claims.id],
  }),
  verifications: many(proof_verifications),
}))

export const proofVerificationsRelations = relations(proof_verifications, ({ one }) => ({
  proof: one(proofs, {
    fields: [proof_verifications.proof_id],
    references: [proofs.id],
  }),
}))

// TypeScript types
export type Claim = typeof claims.$inferSelect
export type NewClaim = typeof claims.$inferInsert

export type Proof = typeof proofs.$inferSelect
export type NewProof = typeof proofs.$inferInsert

export type ProofVerification = typeof proof_verifications.$inferSelect
export type NewProofVerification = typeof proof_verifications.$inferInsert
