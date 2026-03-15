import type { Address, WalletClient } from 'viem'
import { recoverPublicKey, hashTypedData, keccak256, hexToBytes, isAddressEqual } from 'viem'
import type { Eip712Domain, ClaimEip712Message } from '@repo/circuit-utils'
import {
  EIP712_CLAIM_TYPES,
  buildEip712Domain,
  extractPublicKeyComponents,
  uint8ArrayToHex,
  processSignature,
  MAX_TRANSFERS,
  MERKLE_TREE_HEIGHT,
  mapToCircuitTransfers,
  padTransfersArray,
  createEmptyMerkleProof,
} from '@repo/circuit-utils'
import { Barretenberg } from '@aztec/bb.js'
import { formatNullifier } from '@/utils/format.utils'

export interface Eip712ClaimFields {
  claimId: Address
  claimMessageHash: Address
  tokenAddress: string
  counterpartyAddress: string
  isProverSender: boolean
  tokenType: string
  minTransfersSum: string
  maxTransfersSum: string
  minTransfersCount: string
  maxTransfersCount: string
  fromBlockTimestamp: string
  toBlockTimestamp: string
  transfersRootHash: Address
}

export interface TransferData {
  from: string
  to: string
  contractAddress: string
  value: string
  timeStamp: string
  hash: string
}

export interface ServerSigningData {
  eip712: Eip712ClaimFields
  chainId: number
  isProverSender: boolean
  claim: {
    minTransfersSum: string | null
    maxTransfersSum: string | null
    minTransfersCount: number | null
    maxTransfersCount: number | null
    fromBlockTimestamp: number | null
    toBlockTimestamp: number | null
  }
  circuitData: {
    merkleRoot: string
    allTransfers: TransferData[]
    paddedMerkleProofElements: string[][]
    areTransferLeavesEven: boolean[][]
  }
}

export interface PreparedProofData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  circuitInputs: Record<string, any>
  nullifier: string
  proverTransferCount: number
}

function buildClaimMessage(fields: Eip712ClaimFields): ClaimEip712Message {
  return {
    claimId: fields.claimId,
    claimMessageHash: fields.claimMessageHash,
    tokenAddress: fields.tokenAddress as Address,
    counterpartyAddress: fields.counterpartyAddress as Address,
    isProverSender: fields.isProverSender,
    tokenType: Number(fields.tokenType),
    minTransfersSum: BigInt(fields.minTransfersSum),
    maxTransfersSum: BigInt(fields.maxTransfersSum),
    minTransfersCount: Number(fields.minTransfersCount),
    maxTransfersCount: Number(fields.maxTransfersCount),
    fromBlockTimestamp: BigInt(fields.fromBlockTimestamp),
    toBlockTimestamp: BigInt(fields.toBlockTimestamp),
    transfersRootHash: fields.transfersRootHash,
  }
}

function buildClaimTypedData(eip712: Eip712ClaimFields, chainId: number) {
  return {
    domain: buildEip712Domain(chainId),
    types: EIP712_CLAIM_TYPES,
    primaryType: 'Claim' as const,
    message: buildClaimMessage(eip712),
  }
}

export async function signClaimAndDeriveNullifier(
  walletClient: WalletClient,
  eip712: Eip712ClaimFields,
  chainId: number,
) {
  const typedData = buildClaimTypedData(eip712, chainId)

  const signature = await walletClient.signTypedData({
    account: walletClient.account!,
    ...typedData,
  })

  const bb = await Barretenberg.new({ threads: 1 })
  const signatureData = await processSignature(signature as Address, bb)

  return {
    signature,
    nullifier: signatureData.nullifier,
    fullSignature: signatureData.fullSignature,
    typedData,
  }
}

export async function recoverAndVerifyPublicKey(
  signature: Address,
  typedData: { domain: Eip712Domain; types: typeof EIP712_CLAIM_TYPES; primaryType: 'Claim'; message: ClaimEip712Message },
  expectedAddress: string,
): Promise<{ pubKeyX: number[]; pubKeyY: number[] }> {
  const hash = hashTypedData(typedData)

  const publicKey = await recoverPublicKey({ hash, signature })
  const pkBytes = hexToBytes(publicKey)
  const pkHash = keccak256(pkBytes.slice(1))
  const derivedAddress = ('0x' + pkHash.slice(-40)) as Address

  if (!isAddressEqual(derivedAddress, expectedAddress as Address)) {
    throw new Error('Public key does not match prover address')
  }

  return extractPublicKeyComponents(publicKey)
}

function filterProverTransfers(
  serverData: ServerSigningData,
  walletAddress: Address,
) {
  const { isProverSender, circuitData, claim } = serverData
  const { allTransfers, paddedMerkleProofElements, areTransferLeavesEven } = circuitData

  const proverIndices: number[] = []
  const proverTransfers: TransferData[] = []

  allTransfers.forEach((transfer, index) => {
    const matchField = isProverSender ? transfer.from : transfer.to
    if (isAddressEqual(matchField as Address, walletAddress)) {
      proverIndices.push(index)
      proverTransfers.push(transfer)
    }
  })

  if (!proverIndices.length) throw new Error('No transfers found for prover address')
  if (proverIndices.length > MAX_TRANSFERS) {
    throw new Error(`Too many transfers. Maximum ${MAX_TRANSFERS} allowed.`)
  }

  // Validate constraints client-side
  const totalSum = proverTransfers.reduce((sum, t) => sum + BigInt(t.value), 0n)
  const minSum = BigInt(claim.minTransfersSum || '0')
  const maxSum = BigInt(claim.maxTransfersSum || '0')
  const fromTs = BigInt(claim.fromBlockTimestamp || 0)
  const toTs = BigInt(claim.toBlockTimestamp || 0)
  const minCount = claim.minTransfersCount || 0
  const maxCount = claim.maxTransfersCount || 0

  for (const transfer of proverTransfers) {
    const timestamp = BigInt(transfer.timeStamp)
    if (fromTs && timestamp < fromTs) throw new Error('Transfer timestamp before fromBlockTimestamp')
    if (toTs && timestamp > toTs) throw new Error('Transfer timestamp after toBlockTimestamp')
  }
  if (minSum && totalSum < minSum) throw new Error(`Sum ${totalSum} below minimum ${minSum}`)
  if (maxSum && totalSum > maxSum) throw new Error(`Sum ${totalSum} above maximum ${maxSum}`)
  if (minCount && proverTransfers.length < minCount) throw new Error(`Count ${proverTransfers.length} below minimum ${minCount}`)
  if (maxCount && proverTransfers.length > maxCount) throw new Error(`Count ${proverTransfers.length} above maximum ${maxCount}`)

  // Build padded circuit inputs from prover's subset
  const circuitTransfers = mapToCircuitTransfers(
    proverTransfers as Parameters<typeof mapToCircuitTransfers>[0],
  )
  const paddedTransfers = padTransfersArray(circuitTransfers, MAX_TRANSFERS)

  const proverProofElements = proverIndices.map((i) => paddedMerkleProofElements[i]!)
  const proverLeavesEven = proverIndices.map((i) => areTransferLeavesEven[i]!)

  const emptyProof = createEmptyMerkleProof(MERKLE_TREE_HEIGHT)
  const paddedProofElements = [
    ...proverProofElements,
    ...Array(MAX_TRANSFERS - proverProofElements.length).fill(emptyProof.pathElements),
  ]
  const paddedLeavesEven = [
    ...proverLeavesEven,
    ...Array(MAX_TRANSFERS - proverLeavesEven.length).fill(
      emptyProof.pathIndices.map((idx) => idx === 0),
    ),
  ]

  return {
    paddedTransfers,
    paddedMerkleProofElements: paddedProofElements,
    areTransferLeavesEven: paddedLeavesEven,
    proverTransferCount: proverTransfers.length,
  }
}

export function assembleCircuitInputs(
  serverData: ServerSigningData,
  signatureResult: { nullifier: string; fullSignature: number[] },
  publicKeyComponents: { pubKeyX: number[]; pubKeyY: number[] },
  walletAddress: Address,
): PreparedProofData {
  const { eip712, circuitData } = serverData
  const proverData = filterProverTransfers(serverData, walletAddress)

  return {
    circuitInputs: {
      claim: {
        claim_id: eip712.claimId,
        claim_message_hash: eip712.claimMessageHash,
        token_address: eip712.tokenAddress,
        counterparty_address: eip712.counterpartyAddress,
        is_prover_sender: eip712.isProverSender,
        token_type: eip712.tokenType,
        chain_id: serverData.chainId.toString(),
        transfers_root_hash: circuitData.merkleRoot,
        nullifier: signatureResult.nullifier,
      },
      constraints: {
        min_transfers_sum: eip712.minTransfersSum,
        max_transfers_sum: eip712.maxTransfersSum,
        min_transfers_count: eip712.minTransfersCount,
        max_transfers_count: eip712.maxTransfersCount,
        from_block_timestamp: eip712.fromBlockTimestamp,
        to_block_timestamp: eip712.toBlockTimestamp,
      },
      transfers: proverData.paddedTransfers,
      transfers_proofs: proverData.paddedMerkleProofElements,
      are_transfer_leaves_even: proverData.areTransferLeavesEven,
      transfers_amount: proverData.proverTransferCount.toString(),
      prover: {
        pub_key_x: publicKeyComponents.pubKeyX,
        pub_key_y: publicKeyComponents.pubKeyY,
        signature: signatureResult.fullSignature,
      },
    },
    nullifier: formatNullifier(signatureResult.nullifier),
    proverTransferCount: proverData.proverTransferCount,
  }
}

export async function generateProofFromPrepared(prepared: PreparedProofData) {
  const { generateProofClient } = await import('./circuit-client')
  const { proof, publicInputs } = await generateProofClient(prepared.circuitInputs)

  return {
    proofData: uint8ArrayToHex(proof),
    nullifier: prepared.nullifier,
    publicInputs,
    publicInputsFormatted: {
      claim_id: prepared.circuitInputs.claim.claim_id,
      token_address: prepared.circuitInputs.claim.token_address,
      counterparty_address: prepared.circuitInputs.claim.counterparty_address,
      transfers_count: prepared.proverTransferCount,
    },
  }
}
