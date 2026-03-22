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

const TRANSFERS_ROOT_HASH_INDEX = 7

function buildPublicInputsWithRoot(merkleRoot: string): string[] {
  const inputs = Array(15).fill('0x00')
  inputs[TRANSFERS_ROOT_HASH_INDEX] = merkleRoot
  return inputs
}

describe('submitProofAction', () => {
  it('creates a proof for valid claim', async () => {
    const merkleRoot = '0x' + '0'.repeat(64)
    const claim = await createClaim(buildClaimSeed({ merkleRoot }))
    const seed = buildProofSeed(claim.id)
    const { submitProofAction } = await import('@/actions/proofs.actions')

    const result = await submitProofAction({
      claimId: claim.id,
      nullifier: seed.nullifier,
      proofData: seed.proofData,
      publicInputs: buildPublicInputsWithRoot(merkleRoot),
    })

    expect(result?.data?.proofId).toBeDefined()
  })

  it('rejects duplicate nullifier for same claim', async () => {
    const merkleRoot = '0x' + '0'.repeat(64)
    const claim = await createClaim(buildClaimSeed({ merkleRoot }))
    const seed = buildProofSeed(claim.id)

    await createProof(seed)

    const { submitProofAction } = await import('@/actions/proofs.actions')
    const result = await submitProofAction({
      claimId: claim.id,
      nullifier: seed.nullifier,
      proofData: seed.proofData,
      publicInputs: buildPublicInputsWithRoot(merkleRoot),
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

describe('cross-claim proof replay (publicInputs validation)', () => {
  it('multiple users submit valid proofs to same claim — all accepted', async () => {
    const merkleRoot = '0x' + 'ab'.repeat(32)
    const claim = await createClaim(buildClaimSeed({ merkleRoot }))
    const { submitProofAction } = await import('@/actions/proofs.actions')

    const user1 = await submitProofAction({
      claimId: claim.id,
      nullifier: '0x' + '11'.repeat(32),
      proofData: '0x' + 'a1'.repeat(32),
      publicInputs: buildPublicInputsWithRoot(merkleRoot),
    })
    expect(user1?.data?.proofId).toBeDefined()

    const user2 = await submitProofAction({
      claimId: claim.id,
      nullifier: '0x' + '22'.repeat(32),
      proofData: '0x' + 'a2'.repeat(32),
      publicInputs: buildPublicInputsWithRoot(merkleRoot),
    })
    expect(user2?.data?.proofId).toBeDefined()

    const user3 = await submitProofAction({
      claimId: claim.id,
      nullifier: '0x' + '33'.repeat(32),
      proofData: '0x' + 'a3'.repeat(32),
      publicInputs: buildPublicInputsWithRoot(merkleRoot),
    })
    expect(user3?.data?.proofId).toBeDefined()
  })

  it('rejects proof when publicInputs merkle root does not match claim merkle root', async () => {
    const claim = await createClaim(buildClaimSeed({
      merkleRoot: '0x' + 'bb'.repeat(32),
    }))
    const { submitProofAction } = await import('@/actions/proofs.actions')

    // Attacker submits proof with a different merkle root in publicInputs
    const result = await submitProofAction({
      claimId: claim.id,
      nullifier: '0x' + 'dd'.repeat(32),
      proofData: '0x' + 'ab'.repeat(32),
      publicInputs: buildPublicInputsWithRoot('0x' + 'aa'.repeat(32)), // wrong root
    })

    expect(result?.validationErrors?.fieldErrors?.publicInputs).toBeDefined()
  })

  it('cross-claim replay: proof from claim A rejected when submitted to claim B', async () => {
    const claimA = await createClaim(buildClaimSeed({
      merkleRoot: '0x' + 'aa'.repeat(32),
      tokenAddress: '0x' + 'a1'.repeat(20),
    }))
    const claimB = await createClaim(buildClaimSeed({
      merkleRoot: '0x' + 'bb'.repeat(32),
      tokenAddress: '0x' + 'b1'.repeat(20),
    }))
    const { submitProofAction } = await import('@/actions/proofs.actions')

    // User legitimately submits to claim A — accepted
    const resultA = await submitProofAction({
      claimId: claimA.id,
      nullifier: '0x' + '11'.repeat(32),
      proofData: '0x' + 'ab'.repeat(32),
      publicInputs: buildPublicInputsWithRoot('0x' + 'aa'.repeat(32)),
    })
    expect(resultA?.data?.proofId).toBeDefined()

    // Attacker replays same proof to claim B — rejected (different root)
    const resultB = await submitProofAction({
      claimId: claimB.id,
      nullifier: '0x' + '22'.repeat(32),
      proofData: '0x' + 'ab'.repeat(32),
      publicInputs: buildPublicInputsWithRoot('0x' + 'aa'.repeat(32)), // claim A's root
    })

    expect(resultB?.validationErrors?.fieldErrors?.publicInputs).toBeDefined()
  })

  it('multiple users submit to different claims with correct roots — all accepted', async () => {
    const claimA = await createClaim(buildClaimSeed({ merkleRoot: '0x' + 'aa'.repeat(32) }))
    const claimB = await createClaim(buildClaimSeed({ merkleRoot: '0x' + 'bb'.repeat(32) }))
    const { submitProofAction } = await import('@/actions/proofs.actions')

    const user1ClaimA = await submitProofAction({
      claimId: claimA.id,
      nullifier: '0x' + '11'.repeat(32),
      proofData: '0x' + 'a1'.repeat(32),
      publicInputs: buildPublicInputsWithRoot('0x' + 'aa'.repeat(32)),
    })
    expect(user1ClaimA?.data?.proofId).toBeDefined()

    const user2ClaimB = await submitProofAction({
      claimId: claimB.id,
      nullifier: '0x' + '22'.repeat(32),
      proofData: '0x' + 'b1'.repeat(32),
      publicInputs: buildPublicInputsWithRoot('0x' + 'bb'.repeat(32)),
    })
    expect(user2ClaimB?.data?.proofId).toBeDefined()

    const user3ClaimA = await submitProofAction({
      claimId: claimA.id,
      nullifier: '0x' + '33'.repeat(32),
      proofData: '0x' + 'a2'.repeat(32),
      publicInputs: buildPublicInputsWithRoot('0x' + 'aa'.repeat(32)),
    })
    expect(user3ClaimA?.data?.proofId).toBeDefined()
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
