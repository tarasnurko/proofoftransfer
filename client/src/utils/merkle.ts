import { keccak256, toBeHex, zeroPadValue } from 'ethers'

export interface TransferLeaf {
  sender: string
  receiver: string
  token: string
  amount: string
  timestamp: string
  txHash: string
}

// Convert Ethereum address to Field (remove 0x and pad)
function addressToField(address: string): string {
  return BigInt(address).toString()
}

// Compute leaf hash for a transfer
// Note: This should match the compute_transfer_leaf function in the circuit
// Using keccak256 as a placeholder - should use Pedersen in production
export function computeTransferLeaf(transfer: TransferLeaf): string {
  const data = [
    addressToField(transfer.sender),
    addressToField(transfer.receiver),
    addressToField(transfer.token),
    transfer.amount,
    transfer.timestamp,
    transfer.txHash,
  ].join('')

  return keccak256(Buffer.from(data))
}

// Simple Merkle tree implementation
export class MerkleTree {
  private leaves: string[]
  private layers: string[][] = []

  constructor(leaves: string[]) {
    this.leaves = leaves
    this.buildTree()
  }

  private hashPair(left: string, right: string): string {
    // Sort to ensure deterministic ordering
    const [a, b] = left < right ? [left, right] : [right, left]
    return keccak256(Buffer.from(a + b))
  }

  private buildTree(): void {
    this.layers.push(this.leaves)

    while (this.layers[this.layers.length - 1].length > 1) {
      const currentLayer = this.layers[this.layers.length - 1]
      const nextLayer: string[] = []

      for (let i = 0; i < currentLayer.length; i += 2) {
        if (i + 1 < currentLayer.length) {
          nextLayer.push(this.hashPair(currentLayer[i], currentLayer[i + 1]))
        } else {
          // If odd number of elements, hash with itself
          nextLayer.push(this.hashPair(currentLayer[i], currentLayer[i]))
        }
      }

      this.layers.push(nextLayer)
    }
  }

  getRoot(): string {
    return this.layers[this.layers.length - 1][0]
  }

  getProof(leafIndex: number): { path: string[]; indices: number[] } {
    const path: string[] = []
    const indices: number[] = []
    let index = leafIndex

    for (let i = 0; i < this.layers.length - 1; i++) {
      const layer = this.layers[i]
      const isRightNode = index % 2 === 1
      const siblingIndex = isRightNode ? index - 1 : index + 1

      if (siblingIndex < layer.length) {
        path.push(layer[siblingIndex])
      } else {
        // If no sibling, use the same node
        path.push(layer[index])
      }

      indices.push(isRightNode ? 1 : 0)
      index = Math.floor(index / 2)
    }

    // Pad to MERKLE_DEPTH (20)
    const MERKLE_DEPTH = 20
    while (path.length < MERKLE_DEPTH) {
      path.push('0x' + '0'.repeat(64))
      indices.push(0)
    }

    return { path, indices }
  }
}
