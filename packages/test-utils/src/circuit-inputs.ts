import type { Address, Hex } from 'viem'
import type { EtherscanERC20Transfer } from '@repo/types'
import type { Barretenberg } from '@aztec/bb.js'
import type { InputMap } from '@noir-lang/noir_js'
import {
  type MerkleProof,
  type ClaimConstraints,
  MerkleTree,
  bigintToBytes32,
  mapToCircuitTransfers,
  padTransfersArray,
  padMerkleProofsArray,
  constructClaimMessage,
  processSignature,
  extractPublicKeyComponents,
} from '@repo/circuit-utils'
import { generateAccount } from './accounts'
import { buildMerkleTreeWithTransfers } from './merkle'
import { findTransferIndices } from './arrays'

export interface CircuitTestParams {
  proverTransfers: EtherscanERC20Transfer[]
  constraints: ClaimConstraints
  allTransfers: EtherscanERC20Transfer[]
  prover: ReturnType<typeof generateAccount>
  claimIdBytes32: Hex
  claimMessageHashBytes32: Hex
  tokenAddress: Address
  counterpartyAddress: Address
  isProverSender?: boolean
  tokenType?: number
  tokenAddressBytes32: Hex
  counterpartyAddressBytes32: Hex
  merkleTreeZeroValuesStrArr: string[]
  poseidon2HashFn: (left: string, right: string) => Promise<string>
  hashTransferFn: (
    transfer: { from: string; to: string; contractAddress: string; value: string; timeStamp: string; hash: string },
  ) => Promise<Uint8Array>
  barretenbergApi: Barretenberg
  merkleTreeHeight: number
  maxTransfers: number
  nullifier?: string
  signature?: Hex
  publicKey?: Hex
  transferProofs?: MerkleProof[]
}

export const buildCircuitInputs = async (
  params: CircuitTestParams,
): Promise<{ inputs: InputMap; merkleTree: MerkleTree }> => {
  const {
    proverTransfers,
    constraints,
    allTransfers,
    prover,
    claimIdBytes32,
    claimMessageHashBytes32,
    tokenAddress,
    counterpartyAddress,
    isProverSender = true,
    tokenType = 0,
    tokenAddressBytes32,
    counterpartyAddressBytes32,
    merkleTreeZeroValuesStrArr,
    poseidon2HashFn,
    hashTransferFn,
    barretenbergApi,
    merkleTreeHeight,
    maxTransfers,
    nullifier,
    signature,
    publicKey,
    transferProofs,
  } = params

  const merkleTree = await buildMerkleTreeWithTransfers(
    allTransfers,
    hashTransferFn,
    merkleTreeZeroValuesStrArr,
    poseidon2HashFn,
    merkleTreeHeight,
  )

  const proverTransferIndices = findTransferIndices(proverTransfers, allTransfers)
  const proofs = transferProofs || proverTransferIndices.map((index) => merkleTree.proof(index))
  const merkleTreeRoot = merkleTree.root()
  const merkleTreeRootBytes32 = bigintToBytes32(merkleTreeRoot)

  const hashedMessage = constructClaimMessage({
    claimIdBytes32,
    claimMessageHashBytes32,
    tokenAddressBytes32,
    counterpartyAddressBytes32,
    isProverSender,
    tokenType,
    chainId: 1n,
    claimConstraints: constraints,
    merkleTreeRootBytes32,
  })

  const sig = signature || (await prover.sign({ hash: hashedMessage }))
  const { fullSignature, nullifier: computedNullifier } = await processSignature(sig, barretenbergApi)
  const finalNullifier = nullifier ?? computedNullifier
  const pubKey = publicKey ?? prover.publicKey
  const { pubKeyX, pubKeyY } = extractPublicKeyComponents(pubKey)

  const circuitTransfers = mapToCircuitTransfers(proverTransfers)
  const paddedTransfers = padTransfersArray(circuitTransfers, maxTransfers)
  const paddedProofs = padMerkleProofsArray(proofs, maxTransfers, merkleTreeHeight)

  const inputs = {
    claim: {
      claim_id: claimIdBytes32,
      claim_message_hash: claimMessageHashBytes32,
      token_address: tokenAddress,
      counterparty_address: counterpartyAddress,
      is_prover_sender: isProverSender,
      token_type: tokenType.toString(),
      chain_id: '1',
      transfers_root_hash: merkleTreeRoot,
      nullifier: finalNullifier,
    },
    constraints: {
      min_transfers_sum: constraints.minTransfersSum.toString(),
      max_transfers_sum: constraints.maxTransfersSum.toString(),
      min_transfers_count: constraints.minTransfersCount.toString(),
      max_transfers_count: constraints.maxTransfersCount.toString(),
      from_block_timestamp: constraints.fromBlockTimestamp.toString(),
      to_block_timestamp: constraints.toBlockTimestamp.toString(),
    },
    transfers: paddedTransfers,
    transfers_proofs: paddedProofs.map((p) => p.pathElements),
    are_transfer_leaves_even: paddedProofs.map((p) => p.pathIndices.map((idx) => idx === 0)),
    transfers_amount: circuitTransfers.length.toString(),
    prover: {
      pub_key_x: pubKeyX,
      pub_key_y: pubKeyY,
      signature: fullSignature,
    },
  } as unknown as InputMap

  return { inputs, merkleTree }
}
