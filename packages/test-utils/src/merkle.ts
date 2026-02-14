import type { EtherscanERC20Transfer } from '@repo/types'
import { type MerkleTree, MerkleTree as MerkleTreeImpl, fieldToBigint } from '@repo/circuit-utils'

export const buildMerkleTreeWithTransfers = async (
  allTransfers: EtherscanERC20Transfer[],
  hashTransferFn: (
    transfer: Pick<EtherscanERC20Transfer, 'from' | 'to' | 'contractAddress' | 'value' | 'timeStamp'>,
  ) => Promise<Uint8Array>,
  merkleTreeZeroValuesStrArr: string[],
  poseidon2HashFn: (left: string, right: string) => Promise<string>,
  merkleTreeHeight: number,
): Promise<MerkleTreeImpl> => {
  const allTransfersHashes = await Promise.all(allTransfers.map(hashTransferFn))
  const allTransfersHashesStrArr = allTransfersHashes.map((item) =>
    fieldToBigint(item).toString(),
  )

  const merkleTree = new MerkleTreeImpl(
    merkleTreeHeight,
    merkleTreeZeroValuesStrArr,
    poseidon2HashFn,
  )
  await merkleTree.init(allTransfersHashesStrArr)

  return merkleTree
}

export type { MerkleTree }
