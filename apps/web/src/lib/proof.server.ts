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

export interface TransferHashInput {
  from: string
  to: string
  contractAddress: string
  value: string
  timeStamp: string
  hash: string
}

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
  const transferHashesBytes = await Promise.all(
    transfers.map((transfer) => hashTransfer(bb, transfer)),
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
  claimId: string
  transfersRootHash: string
  externalTransfers?: TransferHashInput[]
}

interface VerifyProofServerResult {
  isValid: boolean
  error?: string
}

export async function verifyProofServer(params: VerifyProofServerParams): Promise<VerifyProofServerResult> {
  try {
    const bb = await BarretenbergImpl.new({ threads: 1 })

    let transfers: TransferHashInput[]

    if (params.externalTransfers?.length) {
      transfers = [...params.externalTransfers].sort(
        (a, b) => Number(a.timeStamp) - Number(b.timeStamp),
      )
    } else {
      const claim = await getClaimById(params.claimId)
      if (!claim) throw new Error('Claim not found')

      const queryParams = buildTransferQueryFromClaim(claim)
      const dbTransfers = await TRANSFER_QUERY_FN[claim.tokenType as TokenType](queryParams)
      transfers = dbTransfers.map(mapDbTransferToHashInput)
    }

    const { merkleRoot } = await buildTransfersMerkleTree(bb, transfers)

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

    const backend = new UltraHonkBackend(circuit.bytecode, bb)

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

  const queryParams = buildTransferQueryFromClaim(claim)
  const claimTransfers = await TRANSFER_QUERY_FN[claim.tokenType as TokenType](queryParams)
  if (!claimTransfers.length) throw new Error('No transfers found for this claim')

  const bb = await BarretenbergImpl.new({ threads: 1 })

  const { merkleTree, merkleRoot } = await buildTransfersMerkleTree(
    bb,
    claimTransfers.map(mapDbTransferToHashInput),
  )

  const eip712 = await buildEip712ClaimFields(bb, claim, claimId, merkleRoot)

  return { claim, claimTransfers, merkleTree, merkleRoot, eip712, chainId: claim.chainId }
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
