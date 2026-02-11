import path from 'path'
import { readFile } from 'fs/promises'
import type { Barretenberg } from '@aztec/bb.js'
import { Barretenberg as BarretenbergImpl, UltraHonkBackend } from '@aztec/bb.js'
import {
  hashTransfer,
  poseidon2HashString,
  MerkleTree,
  poseidon2HashStringsLeftRight,
  MERKLE_TREE_HEIGHT,
  ZERO_VALUES,
  fieldToBigint,
  uuidToBytes32,
  bigintToBytes32,
  hexToUint8Array,
} from '@repo/circuit-utils'
import { getTransfersForClaim } from '@/db/queries/transfers'
import { getClaimById } from '@/db/queries/claims'
import type { Eip712ClaimFields } from '@/lib/proof'
import type { TransferEntity } from '@/db/index.types'

export interface TransferHashInput {
  from: string
  to: string
  contractAddress: string
  value: string
  timeStamp: string
}


export function mapDbTransferToHashInput(t: TransferEntity): TransferHashInput {
  return {
    from: t.senderAddress,
    to: t.recipientAddress,
    contractAddress: t.tokenAddress,
    value: t.amount,
    timeStamp: t.blockTimestamp.toString(),
  }
}


export async function buildTransfersMerkleTree(
  api: Barretenberg,
  transfers: TransferHashInput[],
) {
  const transferHashesBytes = await Promise.all(
    transfers.map((t) => hashTransfer(api, t)),
  )
  const transferHashes = transferHashesBytes.map((h) =>
    fieldToBigint(h).toString(),
  )

  const merkleTree = new MerkleTree(
    MERKLE_TREE_HEIGHT,
    ZERO_VALUES,
    (left, right) => poseidon2HashStringsLeftRight(api, left, right),
  )
  await merkleTree.init(transferHashes)

  return { merkleTree, merkleRoot: merkleTree.root(), transferHashes }
}


export async function buildEip712ClaimFields(
  api: Barretenberg,
  claim: {
    message: string
    tokenAddress: string
    recipientAddress: string
    minTransfersSum: string | null
    maxTransfersSum: string | null
    fromBlockTimestamp: number | null
    toBlockTimestamp: number | null
  },
  claimId: string,
  merkleRoot: string | bigint,
): Promise<Eip712ClaimFields> {
  const claimMessageHashBytes = await poseidon2HashString(api, claim.message)
  const claimMessageHashBigInt = BigInt(
    '0x' + Buffer.from(claimMessageHashBytes).toString('hex'),
  )
  const claimMessageHash = bigintToBytes32(claimMessageHashBigInt)

  const claimId32 = uuidToBytes32(claimId)
  const transfersRootHash = bigintToBytes32(merkleRoot)

  return {
    claimId: claimId32,
    claimMessageHash,
    tokenAddress: claim.tokenAddress,
    recipientAddress: claim.recipientAddress,
    minTransfersSum: BigInt(claim.minTransfersSum || '0').toString(),
    maxTransfersSum: BigInt(claim.maxTransfersSum || '0').toString(),
    fromBlockTimestamp: BigInt(claim.fromBlockTimestamp || 0).toString(),
    toBlockTimestamp: BigInt(claim.toBlockTimestamp || 0).toString(),
    transfersRootHash,
  }
}


export async function verifyProofServer(params: {
  proofData: string
  publicInputs: string[]
  claimId: string
  transfersRootHash: string
  externalTransfers?: TransferHashInput[]
}): Promise<{ isValid: boolean; error?: string }> {
  try {
    const api = await BarretenbergImpl.new({ threads: 1 })

    let transfers: TransferHashInput[]

    if (params.externalTransfers?.length) {
      transfers = [...params.externalTransfers].sort(
        (a, b) => Number(a.timeStamp) - Number(b.timeStamp),
      )
    } else {
      const claimTransfers = await getTransfersForClaim(params.claimId)
      transfers = claimTransfers.map(mapDbTransferToHashInput)
    }

    const { merkleRoot } = await buildTransfersMerkleTree(api, transfers)

    const computedRootBigInt = BigInt(merkleRoot)
    const expectedRootBigInt = BigInt(params.transfersRootHash)

    if (computedRootBigInt !== expectedRootBigInt) {
      return {
        isValid: false,
        error: `Root mismatch: computed ${computedRootBigInt}, expected ${expectedRootBigInt}`,
      }
    }

    const circuitPath = path.join(process.cwd(), 'public', 'circuit.json')
    const circuitRaw = await readFile(circuitPath, 'utf-8')
    const circuit = JSON.parse(circuitRaw)

    const backend = new UltraHonkBackend(circuit.bytecode, api)

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


export async function prepareSigningBase(claimId: string) {
  const claim = await getClaimById(claimId)
  if (!claim) throw new Error('Claim not found')

  const claimTransfers = await getTransfersForClaim(claimId)
  if (!claimTransfers.length) throw new Error('No transfers found for this claim')

  const api = await BarretenbergImpl.new({ threads: 1 })

  const { merkleTree, merkleRoot } = await buildTransfersMerkleTree(
    api,
    claimTransfers.map(mapDbTransferToHashInput),
  )

  const eip712 = await buildEip712ClaimFields(api, claim, claimId, merkleRoot)

  return { claim, claimTransfers, merkleTree, merkleRoot, eip712, chainId: claim.chainId }
}
