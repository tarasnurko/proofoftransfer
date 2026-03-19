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
import { TRANSFER_QUERY_FN } from '@/db/queries/transfers'
import { getClaimById } from '@/db/queries/claims'
import type { Eip712ClaimFields } from '@/lib/proof'
import { TokenType, TOKEN_TYPE_CIRCUIT_VALUE } from '@repo/types'
import type { ClaimEntity, TransferEntity } from '@/db/index.types'
import type { TransferHashInput } from '@/types'

export function mapDbTransferToHashInput(transfer: TransferEntity): TransferHashInput {
  const amount = 'amount' in transfer ? transfer.amount : '1'

  return {
    from: transfer.senderAddress,
    to: transfer.recipientAddress,
    contractAddress: transfer.tokenAddress,
    value: amount,
    timeStamp: transfer.blockTimestamp.toString(),
    hash: transfer.txHash,
  }
}

export async function buildTransfersMerkleTree(
  bb: Barretenberg,
  transfers: TransferHashInput[],
) {
  const sorted = [...transfers].sort(
    (a, b) => Number(a.timeStamp) - Number(b.timeStamp) || a.hash.localeCompare(b.hash),
  )
  const transferHashesBytes = await Promise.all(
    sorted.map((transfer) => hashTransfer(bb, transfer)),
  )
  const transferHashes = transferHashesBytes.map((hashBytes) =>
    fieldToBigint(hashBytes).toString(),
  )

  const merkleTree = new MerkleTree(
    MERKLE_TREE_HEIGHT,
    ZERO_VALUES,
    (left, right) => poseidon2HashStringsLeftRight(bb, left, right),
  )
  await merkleTree.init(transferHashes)

  return { merkleTree, merkleRoot: merkleTree.root(), transferHashes }
}

interface BuildEip712ClaimFieldsInput {
  message: string
  tokenAddress: string
  counterpartyAddress: string
  isProverSender: boolean
  tokenType: TokenType
  minTransfersSum: string | null
  maxTransfersSum: string | null
  minTransfersCount: number | null
  maxTransfersCount: number | null
  fromBlockTimestamp: number | null
  toBlockTimestamp: number | null
}

export async function buildEip712ClaimFields(
  bb: Barretenberg,
  claim: BuildEip712ClaimFieldsInput,
  claimId: string,
  merkleRoot: string | bigint,
): Promise<Eip712ClaimFields> {
  const claimMessageHashBytes = await poseidon2HashString(bb, claim.message)
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
    counterpartyAddress: claim.counterpartyAddress,
    isProverSender: claim.isProverSender,
    tokenType: TOKEN_TYPE_CIRCUIT_VALUE[claim.tokenType].toString(),
    minTransfersSum: BigInt(claim.minTransfersSum || '0').toString(),
    maxTransfersSum: BigInt(claim.maxTransfersSum || '0').toString(),
    minTransfersCount: (claim.minTransfersCount || 0).toString(),
    maxTransfersCount: (claim.maxTransfersCount || 0).toString(),
    fromBlockTimestamp: BigInt(claim.fromBlockTimestamp || 0).toString(),
    toBlockTimestamp: BigInt(claim.toBlockTimestamp || 0).toString(),
    transfersRootHash,
  }
}

interface VerifyProofServerParams {
  proofData: string
  publicInputs: string[]
  transfersRootHash: string
  verifierMerkleRoot: string
}

interface VerifyProofServerResult {
  isValid: boolean
  error?: string
}

export async function verifyProofServer(params: VerifyProofServerParams): Promise<VerifyProofServerResult> {
  try {
    if (BigInt(params.verifierMerkleRoot) !== BigInt(params.transfersRootHash)) {
      return {
        isValid: false,
        error: 'Transfers root mismatch — your transfers don\'t match the claim\'s transfers',
      }
    }

    const bb = await BarretenbergImpl.new({ threads: 1 })
    const circuit = await getCircuit()
    const backend = new UltraHonkBackend(circuit.bytecode, bb)

    const verified = await backend.verifyProof({
      proof: hexToUint8Array(params.proofData),
      publicInputs: params.publicInputs,
    })

    return { isValid: verified }
  } catch (error) {
    return { isValid: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function prepareSigningBase(claimId: string) {
  const claim = await getClaimById(claimId)
  if (!claim) throw new Error('Claim not found')

  const queryParams = buildTransferQueryFromClaim(claim)
  const claimTransfers = await TRANSFER_QUERY_FN[claim.tokenType as TokenType](queryParams)
  if (!claimTransfers.length) throw new Error('No transfers found for this claim')

  const bb = await BarretenbergImpl.new({ threads: 1 })

  const hashInputs = claimTransfers.map(mapDbTransferToHashInput)
  const sortedHashInputs = [...hashInputs].sort(
    (a, b) => Number(a.timeStamp) - Number(b.timeStamp) || a.hash.localeCompare(b.hash),
  )

  const { merkleRoot } = await buildTransfersMerkleTree(bb, sortedHashInputs)

  const eip712 = await buildEip712ClaimFields(bb, claim, claimId, merkleRoot)

  // Sort claimTransfers to match merkle tree order
  const sortedTransfers = [...claimTransfers].sort(
    (a, b) => Number(a.blockTimestamp) - Number(b.blockTimestamp) || a.txHash.localeCompare(b.txHash),
  )

  return { claim, claimTransfers: sortedTransfers, merkleRoot, eip712, chainId: claim.chainId }
}

// ─── Circuit cache ──────────────────────────────────────────

let cachedCircuit: { bytecode: string } | null = null
async function getCircuit() {
  if (!cachedCircuit) {
    const raw = await readFile(path.join(process.cwd(), 'public', 'circuit.json'), 'utf-8')
    cachedCircuit = JSON.parse(raw)
  }
  return cachedCircuit!
}

// ─── Helpers ────────────────────────────────────────────────

function buildTransferQueryFromClaim(claim: ClaimEntity) {
  return {
    chainId: claim.chainId,
    tokenAddress: claim.tokenAddress,
    ...(claim.isProverSender
      ? { recipientAddress: claim.counterpartyAddress }
      : { senderAddress: claim.counterpartyAddress }),
    fromTimestamp: claim.fromBlockTimestamp || undefined,
    toTimestamp: claim.toBlockTimestamp || undefined,
  }
}
