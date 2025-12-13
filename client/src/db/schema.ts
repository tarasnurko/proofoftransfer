import { pgTable, text, serial, timestamp, integer } from 'drizzle-orm/pg-core'

export const proofs = pgTable('proofs', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),

  // Public verification data (what the proof claims)
  recipient: text('recipient').notNull(),
  tokenAddress: text('token_address').notNull(),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  minAmount: text('min_amount').notNull(),
  maxAmount: text('max_amount').notNull(),

  // Proof data
  proof: text('proof').notNull(), // Hex string
  publicInputs: text('public_inputs').notNull(), // JSON stringified
  globalTransfersRoot: text('global_transfers_root').notNull(), // Merkle root
  addressCommitment: text('address_commitment').notNull(), // Hash(sender + salt)
  messageHash: text('message_hash').notNull(), // Signed message hash

  // Optional metadata
  message: text('message'), // The actual message text (optional)
})

export type Proof = typeof proofs.$inferSelect
export type InsertProof = typeof proofs.$inferInsert
