import { describe, it, expect, vi } from 'vitest'
import { createClaim } from '@/db/queries/claims'
import { createProof } from '@/db/queries/proofs'
import { buildClaimSeed, buildProofSeed } from '@repo/test-utils'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('submitProofAction', () => {
  it('creates a proof for valid claim', async () => {
    const claim = await createClaim(buildClaimSeed())
    const { submitProofAction } = await import('@/actions/proofs.actions')

    const result = await submitProofAction({
      claimId: claim.id,
      nullifier: '0x' + 'ab'.repeat(32),
      proofData: '0x' + 'cd'.repeat(64),
      publicInputs: ['0x01', '0x02'],
    })

    expect(result?.data?.proofId).toBeDefined()
  })

  it('rejects duplicate nullifier for same claim', async () => {
    const claim = await createClaim(buildClaimSeed())
    const nullifier = '0x' + 'ee'.repeat(32)

    await createProof(buildProofSeed(claim.id, { nullifier }))

    const { submitProofAction } = await import('@/actions/proofs.actions')
    const result = await submitProofAction({
      claimId: claim.id,
      nullifier,
      proofData: '0x' + 'cd'.repeat(64),
      publicInputs: ['0x01'],
    })

    expect(result?.validationErrors?.fieldErrors?.nullifier).toBeDefined()
    expect(result?.validationErrors?.fieldErrors?.nullifier?.[0]).toContain('already been submitted')
  })

  it('returns error for non-existent claim', async () => {
    const { submitProofAction } = await import('@/actions/proofs.actions')
    const result = await submitProofAction({
      claimId: '00000000-0000-0000-0000-000000000000',
      nullifier: '0x' + 'ab'.repeat(32),
      proofData: '0x' + 'cd'.repeat(64),
      publicInputs: ['0x01'],
    })

    expect(result?.validationErrors?.fieldErrors?.claimId).toBeDefined()
    expect(result?.validationErrors?.fieldErrors?.claimId?.[0]).toContain('Claim not found')
  })
})

describe('verifyProofAction', () => {
  it('rejects self-verification (same nullifier)', async () => {
    const claim = await createClaim(buildClaimSeed({ merkleRoot: '0x' + 'ab'.repeat(32) }))
    const nullifier = '0x' + 'ff'.repeat(32)
    const proof = await createProof(buildProofSeed(claim.id, { nullifier }))

    const { verifyProofAction } = await import('@/actions/proofs.actions')
    const result = await verifyProofAction({
      id: proof.id,
      nullifier, // same as proof's nullifier
      transfers: [{
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        contractAddress: '0x' + '3'.repeat(40),
        value: '1000',
        timeStamp: '1700000000',
      }],
    })

    expect(result?.serverError).toContain('Cannot verify your own proof')
  })

  it('rejects when proof not found', async () => {
    const { verifyProofAction } = await import('@/actions/proofs.actions')
    const result = await verifyProofAction({
      id: '00000000-0000-0000-0000-000000000000',
      nullifier: '0x' + 'aa'.repeat(32),
      transfers: [{
        from: '0x' + '1'.repeat(40),
        to: '0x' + '2'.repeat(40),
        contractAddress: '0x' + '3'.repeat(40),
        value: '1000',
        timeStamp: '1700000000',
      }],
    })

    expect(result?.serverError).toContain('Proof not found')
  })
})
