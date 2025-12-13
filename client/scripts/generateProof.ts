#!/usr/bin/env tsx
/**
 * Standalone proof generation script
 *
 * This script generates zero-knowledge proofs using Noir outside of Next.js
 * to avoid bundling issues with WASM and Node.js APIs.
 *
 * Usage:
 *   yarn generate-proof --id=<proof_id>
 */

import { generateProof, proofToHex } from '../src/utils/generateProof'
import { db } from '../src/db'
import { proofs } from '../src/db/schema'
import { eq } from 'drizzle-orm'

async function main() {
  const args = process.argv.slice(2)
  const idArg = args.find(arg => arg.startsWith('--id='))

  if (!idArg) {
    console.error('Usage: yarn generate-proof --id=<proof_id>')
    process.exit(1)
  }

  const proofId = parseInt(idArg.split('=')[1])

  console.log(`\nGenerating proof for ID: ${proofId}`)
  console.log('=' .repeat(50))

  // Fetch proof record from database
  const [proofRecord] = await db
    .select()
    .from(proofs)
    .where(eq(proofs.id, proofId))
    .limit(1)

  if (!proofRecord) {
    console.error(`Proof record with ID ${proofId} not found`)
    process.exit(1)
  }

  console.log(`\nProof Record:`)
  console.log(`  Recipient: ${proofRecord.recipient}`)
  console.log(`  Token: ${proofRecord.tokenAddress}`)
  console.log(`  Date Range: ${proofRecord.startDate} to ${proofRecord.endDate}`)
  console.log(`  Amount Range: ${proofRecord.minAmount} - ${proofRecord.maxAmount}`)

  console.log(`\nNote: Actual proof generation requires:`)
  console.log(`  1. Transfer data (fetch from Etherscan)`)
  console.log(`  2. User signature and address commitment`)
  console.log(`  3. Merkle tree construction`)
  console.log(`  4. Noir circuit execution`)
  console.log(`\nThis is a placeholder - implement the full logic here.`)

  process.exit(0)
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
