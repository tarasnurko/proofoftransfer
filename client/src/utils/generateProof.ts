import { UltraHonkBackend } from '@aztec/bb.js'
import { Noir } from '@noir-lang/noir_js'
import { CompiledCircuit } from '@noir-lang/types'
import circuit from '@/circuits/circuts.json'
import { MerkleTree, TransferLeaf, computeTransferLeaf } from './merkle'
import type { ERC20Transfer } from '@/services/etherscan'
import { keccak256, toUtf8Bytes, Signature } from 'ethers'

const MAX_TRANSFERS = 50
const MERKLE_DEPTH = 20

export interface ProofInputs {
  senderAddress: string
  salt: string
  addressCommitment: string
  publicKeyX: string
  publicKeyY: string
  signature: string
  messageHash: string
  allTransfers: ERC20Transfer[] // All transfers for Merkle tree
  proverTransfers: ERC20Transfer[] // Only prover's transfers
  tokenAddress: string
  receiverAddress: string
  startDate: number
  endDate: number
  minAmount: string
  maxAmount: string
}

export interface ProofResult {
  proof: Uint8Array
  publicInputs: string[]
}

// Helper to convert hex string to byte array
function hexToBytes(hex: string): number[] {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes: number[] = []
  for (let i = 0; i < cleaned.length; i += 2) {
    bytes.push(parseInt(cleaned.slice(i, i + 2), 16))
  }
  return bytes
}

// Helper to pad array to length
function padArray<T>(arr: T[], length: number, fill: T): T[] {
  const result = [...arr]
  while (result.length < length) {
    result.push(fill)
  }
  return result
}

// Build Merkle tree from all transfers
function buildMerkleTree(
  transfers: ERC20Transfer[],
  tokenAddress: string,
  receiverAddress: string
): MerkleTree {
  const leaves = transfers.map((t) =>
    computeTransferLeaf({
      sender: t.from,
      receiver: t.to,
      token: tokenAddress,
      amount: t.value,
      timestamp: t.timeStamp,
      txHash: t.hash,
    })
  )

  return new MerkleTree(leaves)
}

// Format transfer for circuit input
function formatTransfer(
  transfer: ERC20Transfer,
  merkleProof: { path: bigint[]; indices: number[] }
) {
  return {
    amount: transfer.value,
    timestamp: transfer.timeStamp,
    tx_hash: hexToBytes(transfer.hash),
    merkle_path: merkleProof.path.map((p) => p.toString()),
    path_indices: merkleProof.indices.map((i) => i.toString()),
    is_valid: true,
  }
}

// Create empty transfer for padding
function emptyTransfer() {
  return {
    amount: '0',
    timestamp: '0',
    tx_hash: Array(32).fill(0),
    merkle_path: Array(MERKLE_DEPTH).fill('0'),
    path_indices: Array(MERKLE_DEPTH).fill('0'),
    is_valid: false,
  }
}

export async function generateProof(
  inputs: ProofInputs,
  showLog?: (content: string) => void
): Promise<ProofResult> {
  const log = showLog || console.log

  try {
    log('Building Merkle tree... ⏳')

    // Build Merkle tree from all transfers
    const merkleTree = buildMerkleTree(
      inputs.allTransfers,
      inputs.tokenAddress,
      inputs.receiverAddress
    )

    const globalTransfersRoot = merkleTree.getRoot()
    log('Merkle tree built ✅')

    // Format prover's transfers with Merkle proofs
    log('Generating Merkle proofs... ⏳')
    const formattedTransfers = inputs.proverTransfers.map((transfer, index) => {
      // Find index in all transfers
      const globalIndex = inputs.allTransfers.findIndex(
        (t) => t.hash === transfer.hash
      )
      const merkleProof = merkleTree.getProof(globalIndex)
      return formatTransfer(transfer, merkleProof)
    })

    // Pad transfers array to MAX_TRANSFERS
    const paddedTransfers = padArray(
      formattedTransfers,
      MAX_TRANSFERS,
      emptyTransfer()
    )
    log('Merkle proofs generated ✅')

    // Use the address commitment sent from client (already taken modulo field)
    // Don't recompute it here to avoid field overflow issues

    // Format circuit inputs
    const circuitInputs = {
      pub_inputs: {
        global_transfers_root: globalTransfersRoot.toString(),
        addr_commit: inputs.addressCommitment,
        token_address: inputs.tokenAddress,
        receiver_address: inputs.receiverAddress,
        start_date: inputs.startDate.toString(),
        end_date: inputs.endDate.toString(),
        min_amount: inputs.minAmount,
        max_amount: inputs.maxAmount,
        message_hash: hexToBytes(inputs.messageHash),
      },
      priv_witness: {
        sender_address: inputs.senderAddress,
        salt: inputs.salt,
        pub_key_x: hexToBytes(inputs.publicKeyX),
        pub_key_y: hexToBytes(inputs.publicKeyY),
        signature: hexToBytes(inputs.signature).slice(0, 64), // Remove recovery byte (v)
        transfers: paddedTransfers,
      },
    }

    log('Initializing Noir... ⏳')
    const noir = new Noir(circuit as CompiledCircuit)

    // Initialize ACVM backend for Node.js
    await noir.init()

    const backend = new UltraHonkBackend(circuit.bytecode, { threads: 1 })
    log('Noir initialized ✅')

    log('Generating witness... ⏳')
    const { witness } = await noir.execute(circuitInputs)
    log('Witness generated ✅')

    log('Generating proof... ⏳')
    const { proof, publicInputs } = await backend.generateProof(witness, {
      keccak: true,
    })
    log('Proof generated ✅')

    log('Verifying proof... ⏳')
    const offChainProof = await backend.generateProof(witness)
    const isValid = await backend.verifyProof(offChainProof)
    log(`Proof is valid: ${isValid} ✅`)

    return { proof, publicInputs }
  } catch (error) {
    log('Error generating proof ❌')
    console.error(error)
    throw error
  }
}

// Helper to convert proof to hex string
export function proofToHex(proof: Uint8Array): string {
  return (
    '0x' +
    Array.from(proof)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  )
}
