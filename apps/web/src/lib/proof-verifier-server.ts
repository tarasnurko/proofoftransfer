'use server'

import path from 'path'
import { readFile } from 'fs/promises'
import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js'
import { Noir } from '@noir-lang/noir_js'
import { getTransfersForClaim } from '@/db/queries/transfers'
import {
  hashTransfer,
  MerkleTree,
  poseidon2HashStringsLeftRight,
  MERKLE_TREE_HEIGHT,
  ZERO_VALUES,
  fieldToBigint,
} from '@repo/circuit-utils'

interface ExternalTransfer {
  from: string
  to: string
  contractAddress: string
  value: string
  timeStamp: string
}

interface VerifyProofServerParams {
  proofData: string
  publicInputs: string[]
  claimId: string
  transfersRootHash: string
  externalTransfers?: ExternalTransfer[]
}

interface VerifyProofResult {
  isValid: boolean
  error?: string
}

export async function verifyProofServer(
  params: VerifyProofServerParams
): Promise<VerifyProofResult> {
  try {
    // Initialize Barretenberg API
    const api = await Barretenberg.new({ threads: 1 })

    // 1. Build transfer hashes — from external transfers or DB
    let transferHashesBytes: Uint8Array[]

    if (params.externalTransfers?.length) {
      // Sort external transfers by timestamp to match merkle tree ordering
      const sorted = [...params.externalTransfers].sort(
        (a, b) => Number(a.timeStamp) - Number(b.timeStamp)
      )
      transferHashesBytes = await Promise.all(
        sorted.map((t) =>
          hashTransfer(api, {
            from: t.from,
            to: t.to,
            contractAddress: t.contractAddress,
            value: t.value,
            timeStamp: t.timeStamp,
          })
        )
      )
    } else {
      const claimTransfers = await getTransfersForClaim(params.claimId)
      transferHashesBytes = await Promise.all(
        claimTransfers.map((t) =>
          hashTransfer(api, {
            from: t.senderAddress,
            to: t.recipientAddress,
            contractAddress: t.tokenAddress,
            value: t.amount,
            timeStamp: t.blockTimestamp.toString(),
          })
        )
      )
    }

    // 2. Rebuild merkle tree

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

    // 3. Verify root consistency (normalize both to bigint for comparison)
    const computedRootBigInt = BigInt(computedRoot)
    const expectedRootBigInt = BigInt(params.transfersRootHash)

    if (computedRootBigInt !== expectedRootBigInt) {
      return {
        isValid: false,
        error: `Root mismatch: computed ${computedRootBigInt}, expected ${expectedRootBigInt}`,
      }
    }

    // 4. Load circuit from public directory
    const circuitPath = path.join(process.cwd(), 'public', 'circuit.json')
    const circuitRaw = await readFile(circuitPath, 'utf-8')
    const circuit = JSON.parse(circuitRaw)

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
