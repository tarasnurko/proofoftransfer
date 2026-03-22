import type { TransferHashInput } from '@/types'
import {
  hashTransfer,
  MerkleTree,
  poseidon2HashStringsLeftRight,
  fieldToBigint,
  MERKLE_TREE_HEIGHT,
  ZERO_VALUES,
} from '@repo/circuit-utils'

export async function buildMerkleTreeClient(
  transfers: TransferHashInput[],
): Promise<{ tree: MerkleTree; root: string }> {
  const { Barretenberg } = await import('@aztec/bb.js')
  const bb = await Barretenberg.new({ threads: 1 })

  try {
    const sorted = [...transfers].sort(
      (a, b) => Number(a.timeStamp) - Number(b.timeStamp) || a.hash.localeCompare(b.hash),
    )
    const transferHashes = await Promise.all(
      sorted.map((t) => hashTransfer(bb, t)),
    )
    const hashStrings = transferHashes.map((h) => fieldToBigint(h).toString())

    const tree = new MerkleTree(
      MERKLE_TREE_HEIGHT,
      ZERO_VALUES,
      (left, right) => poseidon2HashStringsLeftRight(bb, left, right),
    )
    await tree.init(hashStrings)
    return { tree, root: tree.root() }
  } finally {
    await bb.destroy()
  }
}

export async function buildMerkleRootClient(
  transfers: TransferHashInput[],
): Promise<string> {
  const { root } = await buildMerkleTreeClient(transfers)
  return root
}
