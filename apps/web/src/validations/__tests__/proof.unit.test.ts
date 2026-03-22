import { describe, it, expect } from 'vitest'
import { submitProofSchema } from '../proof'
import { randomUUID } from 'crypto'

describe('submitProofSchema', () => {
  const validInput = {
    claimId: randomUUID(),
    nullifier: '0x' + 'ab'.repeat(32),
    proofData: '0x' + 'cd'.repeat(64),
    publicInputs: ['0x01', '0x02'],
  }

  it('accepts valid input', () => {
    const result = submitProofSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('rejects invalid uuid for claimId', () => {
    const result = submitProofSchema.safeParse({ ...validInput, claimId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid nullifier format', () => {
    const result = submitProofSchema.safeParse({ ...validInput, nullifier: 'zzz' })
    expect(result.success).toBe(false)
  })

  it('rejects empty proofData', () => {
    const result = submitProofSchema.safeParse({ ...validInput, proofData: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty publicInputs', () => {
    const result = submitProofSchema.safeParse({ ...validInput, publicInputs: [] })
    expect(result.success).toBe(false)
  })

  it('rejects nullifier without 0x prefix', () => {
    const result = submitProofSchema.safeParse({ ...validInput, nullifier: 'ab'.repeat(32) })
    expect(result.success).toBe(false)
  })
})
