'use server'

import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js'
import { Noir } from '@noir-lang/noir_js'
import { getTransfersForClaim } from '@/db/queries/transfers'
import { getClaimById } from '@/db/queries/claims'
import {
  hashTransfer,
  MerkleTree,
  poseidon2HashStringsLeftRight,
  MERKLE_TREE_HEIGHT,
  ZERO_VALUES,
  fieldToBigint,
} from '@repo/circuit-utils'

interface VerifyProofParams {
  proofData: string
  publicInputs: string[]
  claimId: string
  transfersRootHash: string
}

interface VerifyProofResult {
  isValid: boolean
  error?: string
}

export async function verifyProofServer(
  params: VerifyProofParams
): Promise<VerifyProofResult> {
  try {
    // Initialize Barretenberg API
    const api = await Barretenberg.new({ threads: 1 })

    // 1. Fetch claim and transfers
    const claim = await getClaimById(params.claimId)
    if (!claim) {
      return { isValid: false, error: 'Claim not found' }
    }

    const claimTransfers = await getTransfersForClaim(params.claimId)

    // 2. Rebuild merkle tree
    const transferHashesBytes = await Promise.all(
      claimTransfers.map(({ transfers: t }) =>
        hashTransfer(api, {
          from: t.senderAddress,
          to: t.recipientAddress,
          contractAddress: t.tokenAddress,
          value: t.amount,
          timeStamp: t.blockTimestamp.toString(),
        })
      )
    )

    const transferHashes = transferHashesBytes.map((hash) =>
      fieldToBigint(hash).toString()
    )

    const merkleTree = new MerkleTree(
      MERKLE_TREE_HEIGHT,
      ZERO_VALUES,
      (left, right) => poseidon2HashStringsLeftRight(api, left, right)
    )

    await merkleTree.init(transferHashes)
    const computedRoot = merkleTree.root()

    // 3. Verify root consistency
    if (computedRoot !== params.transfersRootHash) {
      return {
        isValid: false,
        error: `Root mismatch: computed ${computedRoot}, expected ${params.transfersRootHash}`,
      }
    }

    // 4. Load circuit
    const circuitResponse = await fetch('/circuit.json')
    if (!circuitResponse.ok) {
      return { isValid: false, error: 'Failed to load circuit' }
    }
    const circuit = await circuitResponse.json()

    // 5. Verify ZK proof
    const backend = new UltraHonkBackend(circuit.bytecode, api)
    const noir = new Noir(circuit)

    const verified = await backend.verifyProof({
      proof: hexToUint8Array(params.proofData),
      publicInputs: params.publicInputs,
    })

    return { isValid: verified }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return { isValid: false, error: errorMessage }
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = hex.startsWith('0x') ? hex.slice(2) : hex
  const matches = bytes.match(/.{1,2}/g)
  if (!matches) {
    throw new Error('Invalid hex string')
  }
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)))
}
