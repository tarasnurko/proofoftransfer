import { describe, it, expect, vi } from 'vitest'
import { createClaim } from '@/db/queries/claims'
import { createProof } from '@/db/queries/proofs'
import { buildClaimSeed, buildProofSeed, buildExternalTransfer } from '@repo/test-utils'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('submitProofAction', () => {
  it('creates a proof for valid claim', async () => {
    const claim = await createClaim(buildClaimSeed())
    const seed = buildProofSeed(claim.id)
    const { submitProofAction } = await import('@/actions/proofs.actions')

    const result = await submitProofAction({
      claimId: claim.id,
      nullifier: seed.nullifier,
      proofData: seed.proofData,
      publicInputs: seed.publicInputs as string[],
    })

    expect(result?.data?.proofId).toBeDefined()
  })

  it('rejects duplicate nullifier for same claim', async () => {
    const claim = await createClaim(buildClaimSeed())
    const seed = buildProofSeed(claim.id)

    await createProof(seed)

    const { submitProofAction } = await import('@/actions/proofs.actions')
    const result = await submitProofAction({
      claimId: claim.id,
      nullifier: seed.nullifier,
      proofData: seed.proofData,
      publicInputs: seed.publicInputs as string[],
    })

    expect(result?.validationErrors?.fieldErrors?.nullifier).toBeDefined()
    expect(result?.validationErrors?.fieldErrors?.nullifier?.[0]).toContain('already been submitted')
  })

  it('returns error for non-existent claim', async () => {
    const { submitProofAction } = await import('@/actions/proofs.actions')
    const seed = buildProofSeed('00000000-0000-0000-0000-000000000000')

    const result = await submitProofAction({
      claimId: '00000000-0000-0000-0000-000000000000',
      nullifier: seed.nullifier,
      proofData: seed.proofData,
      publicInputs: seed.publicInputs as string[],
    })

    expect(result?.validationErrors?.fieldErrors?.claimId).toBeDefined()
    expect(result?.validationErrors?.fieldErrors?.claimId?.[0]).toContain('Claim not found')
  })
})

describe('verifyProofAction', () => {
  const baseTransfer = buildExternalTransfer()

  it('rejects self-verification (same nullifier)', async () => {
    const claim = await createClaim(buildClaimSeed({ merkleRoot: '0x' + 'ab'.repeat(32) }))
    const proof = await createProof(buildProofSeed(claim.id))

    const { verifyProofAction } = await import('@/actions/proofs.actions')
    const result = await verifyProofAction({
      id: proof.id,
      nullifier: proof.nullifier, // same as proof's nullifier
      transfers: [baseTransfer],
    })

    expect(result?.serverError).toContain('Cannot verify your own proof')
  })

  it('rejects when proof not found', async () => {
    const { verifyProofAction } = await import('@/actions/proofs.actions')
    const result = await verifyProofAction({
      id: '00000000-0000-0000-0000-000000000000',
      nullifier: buildProofSeed('dummy').nullifier,
      transfers: [baseTransfer],
    })

    expect(result?.serverError).toContain('Proof not found')
  })
})
