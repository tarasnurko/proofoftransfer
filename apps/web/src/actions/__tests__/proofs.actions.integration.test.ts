import { describe, it, expect, vi } from 'vitest'
import { createClaim } from '@/db/queries/claims'
import { createProof } from '@/db/queries/proofs'
import { getVerificationStats } from '@/db/queries/verifications'
import { buildClaimSeed, buildProofSeed } from '@repo/test-utils'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/proof.server', () => ({
  verifyProofServer: vi.fn(),
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
  const dummyMerkleRoot = '12345678901234567890'

  it('rejects self-verification (same nullifier)', async () => {
    const claim = await createClaim(buildClaimSeed({ merkleRoot: '0x' + 'ab'.repeat(32) }))
    const proof = await createProof(buildProofSeed(claim.id))

    const { verifyProofAction } = await import('@/actions/proofs.actions')
    const result = await verifyProofAction({
      id: proof.id,
      nullifier: proof.nullifier, // same as proof's nullifier
      merkleRoot: dummyMerkleRoot,
    })

    expect(result?.serverError).toContain('Cannot verify your own proof')
  })

  it('rejects when proof not found', async () => {
    const { verifyProofAction } = await import('@/actions/proofs.actions')
    const result = await verifyProofAction({
      id: '00000000-0000-0000-0000-000000000000',
      nullifier: buildProofSeed('dummy').nullifier,
      merkleRoot: dummyMerkleRoot,
    })

    expect(result?.serverError).toContain('Proof not found')
  })
})

describe('verifyProofAction counting rules', () => {
  const verifierNullifier = '0x' + 'cc'.repeat(32)
  const dummyMerkleRoot = '12345678901234567890'

  async function setupProofWithClaim() {
    const claim = await createClaim(buildClaimSeed({ merkleRoot: '0x' + 'ab'.repeat(32) }))
    const proof = await createProof(buildProofSeed(claim.id))
    return { claim, proof }
  }

  async function verifyWith(proofId: string, nullifier: string, mockResult: { isValid: boolean; error?: string }) {
    const { verifyProofServer } = await import('@/lib/proof.server')
    vi.mocked(verifyProofServer).mockResolvedValueOnce(mockResult)

    const { verifyProofAction } = await import('@/actions/proofs.actions')
    return verifyProofAction({ id: proofId, nullifier, merkleRoot: dummyMerkleRoot })
  }

  it('first failure increments failed count', async () => {
    const { proof } = await setupProofWithClaim()

    const result = await verifyWith(proof.id, verifierNullifier, {
      isValid: false,
      error: 'Root mismatch',
    })

    expect(result?.data?.isValid).toBe(false)
    expect(result?.data?.stats).toEqual({ total: 1, successful: 0, failed: 1 })
  })

  it('retry failure keeps failed count unchanged', async () => {
    const { proof } = await setupProofWithClaim()

    await verifyWith(proof.id, verifierNullifier, { isValid: false, error: 'Root mismatch' })
    const result = await verifyWith(proof.id, verifierNullifier, { isValid: false, error: 'Root mismatch again' })

    expect(result?.data?.isValid).toBe(false)
    expect(result?.data?.stats).toEqual({ total: 1, successful: 0, failed: 1 })
  })

  it('success after failure: failed decreases, successful increases', async () => {
    const { proof } = await setupProofWithClaim()

    await verifyWith(proof.id, verifierNullifier, { isValid: false, error: 'Root mismatch' })
    const stats1 = await getVerificationStats(proof.id)
    expect(stats1).toEqual({ total: 1, successful: 0, failed: 1 })

    const result = await verifyWith(proof.id, verifierNullifier, { isValid: true })

    expect(result?.data?.isValid).toBe(true)
    expect(result?.data?.stats).toEqual({ total: 1, successful: 1, failed: 0 })
  })

  it('blocks re-verification after success', async () => {
    const { proof } = await setupProofWithClaim()

    await verifyWith(proof.id, verifierNullifier, { isValid: true })
    const result = await verifyWith(proof.id, verifierNullifier, { isValid: true })

    expect(result?.serverError).toContain('You have already verified this proof')
  })

  it('first success without prior failure', async () => {
    const { proof } = await setupProofWithClaim()

    const result = await verifyWith(proof.id, verifierNullifier, { isValid: true })

    expect(result?.data?.isValid).toBe(true)
    expect(result?.data?.stats).toEqual({ total: 1, successful: 1, failed: 0 })
  })

  it('different users get independent counts', async () => {
    const { proof } = await setupProofWithClaim()
    const userA = '0x' + 'aa'.repeat(32)
    const userB = '0x' + 'bb'.repeat(32)

    await verifyWith(proof.id, userA, { isValid: false, error: 'Root mismatch' })
    const result = await verifyWith(proof.id, userB, { isValid: true })

    expect(result?.data?.stats).toEqual({ total: 2, successful: 1, failed: 1 })
  })
})
