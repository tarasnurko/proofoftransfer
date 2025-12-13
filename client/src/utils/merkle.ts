import { poseidon2Hash } from '@zkpassport/poseidon2'
import { IMT, IMTNode } from '@zk-kit/imt'

export interface TransferLeaf {
  sender: string
  receiver: string
  token: string
  amount: string
  timestamp: string
  txHash: string
}

// Convert hex string to Field element (bigint)
function hexToField(hex: string): bigint {
  return BigInt(hex)
}

// Convert bytes32 (tx hash) to Field element
function txHashToField(txHash: string): bigint {
  // Remove 0x prefix if present
  const hex = txHash.startsWith('0x') ? txHash.slice(2) : txHash

  // Convert hex string to bigint
  let result = BigInt(0)
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16)
    result = result * BigInt(256) + BigInt(byte)
  }

  return result
}

// Compute leaf hash for a transfer
// MUST match compute_transfer_leaf in circuit (using Poseidon2 with 6 inputs)
export function computeTransferLeaf(transfer: TransferLeaf): bigint {
  const inputs = [
    hexToField(transfer.sender),
    hexToField(transfer.receiver),
    hexToField(transfer.token),
    BigInt(transfer.amount),
    BigInt(transfer.timestamp),
    txHashToField(transfer.txHash),
  ]

  return poseidon2Hash(inputs)
}

// Poseidon2 hash function for Merkle tree nodes
// MUST match Poseidon2::hash([left, right], 2) in circuit
// IMT expects a function that takes an array of IMTNode (string | bigint)
function hashNode(nodes: IMTNode[]): bigint {
  // Convert IMTNode[] to bigint[] for poseidon2Hash
  const bigintNodes: bigint[] = nodes.map((node) =>
    typeof node === 'string' ? BigInt(node) : (node as bigint)
  )
  // For binary tree, nodes array will have 2 elements [left, right]
  return poseidon2Hash(bigintNodes)
}

// Merkle tree using Poseidon2 hash
export class MerkleTree {
  private tree: IMT

  constructor(leaves: bigint[]) {
    // Create IMT with Poseidon2 hash, depth 20, zero value 0, arity 2 (binary tree)
    this.tree = new IMT(hashNode, 20, BigInt(0), 2, leaves)
  }

  getRoot(): bigint {
    const root = this.tree.root
    return typeof root === 'string' ? BigInt(root) : (root as bigint)
  }

  getProof(leafIndex: number): { path: bigint[]; indices: number[] } {
    const proof = this.tree.createProof(leafIndex)

    // Convert proof to circuit format
    const path = proof.siblings.map((sibling) =>
      Array.isArray(sibling) ? sibling[0] : sibling
    )

    // Path indices: 0 if current node is left child, 1 if right child
    const indices = proof.pathIndices

    // Ensure we have exactly 20 elements (MERKLE_DEPTH)
    while (path.length < 20) {
      path.push(BigInt(0))
    }
    while (indices.length < 20) {
      indices.push(0)
    }

    return {
      path: path.slice(0, 20),
      indices: indices.slice(0, 20)
    }
  }
}
