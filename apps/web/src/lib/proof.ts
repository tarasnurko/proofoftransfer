import type { Address, WalletClient } from 'viem'
import { recoverPublicKey, hashTypedData, keccak256, hexToBytes, isAddressEqual } from 'viem'
import type { Eip712Domain, ClaimEip712Message } from '@repo/circuit-utils'
import { EIP712_CLAIM_TYPES, buildEip712Domain, extractPublicKeyComponents, uint8ArrayToHex } from '@repo/circuit-utils'
import { api } from '@/lib/api/client'

export interface Eip712ClaimFields {
  claimId: Address
  claimMessageHash: Address
  tokenAddress: string
  recipientAddress: string
  minTransfersSum: string
  maxTransfersSum: string
  fromBlockTimestamp: string
  toBlockTimestamp: string
  transfersRootHash: Address
}

export interface ServerSigningData {
  eip712: Eip712ClaimFields
  chainId: number
  circuitData: {
    merkleRoot: string
    paddedTransfers: unknown[]
    paddedMerkleProofElements: unknown[]
    areTransferLeavesEven: boolean[][]
    proverTransferCount: number
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
    recipientAddress: fields.recipientAddress as Address,
    minTransfersSum: BigInt(fields.minTransfersSum),
    maxTransfersSum: BigInt(fields.maxTransfersSum),
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

  const sigRes = await api.api.signature.process.$post({
    json: { signature },
  })
  if (!sigRes.ok) throw new Error('Failed to process signature')
  const sigData = await sigRes.json()

  return {
    signature,
    nullifier: sigData.nullifier,
    fullSignature: sigData.fullSignature,
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

export function assembleCircuitInputs(
  serverData: ServerSigningData,
  signatureResult: { nullifier: string; fullSignature: number[] },
  publicKeyComponents: { pubKeyX: number[]; pubKeyY: number[] },
): PreparedProofData {
  const { eip712, circuitData } = serverData

  return {
    circuitInputs: {
      claim_id: eip712.claimId,
      claim_message_hash: eip712.claimMessageHash,
      token_address: eip712.tokenAddress,
      recipient_address: eip712.recipientAddress,
      chain_id: serverData.chainId.toString(),
      min_transfers_sum: eip712.minTransfersSum,
      max_transfers_sum: eip712.maxTransfersSum,
      from_block_timestamp: eip712.fromBlockTimestamp,
      to_block_timestamp: eip712.toBlockTimestamp,
      transfers_root_hash: circuitData.merkleRoot,
      nullifier: signatureResult.nullifier,
      transfers: circuitData.paddedTransfers,
      transfers_proofs: circuitData.paddedMerkleProofElements,
      are_transfer_leaves_even: circuitData.areTransferLeavesEven,
      transfers_amount: circuitData.proverTransferCount.toString(),
      prover_pub_key_x: publicKeyComponents.pubKeyX,
      prover_pub_key_y: publicKeyComponents.pubKeyY,
      prover_signature: signatureResult.fullSignature,
    },
    nullifier: '0x' + BigInt(signatureResult.nullifier).toString(16).padStart(64, '0'),
    proverTransferCount: circuitData.proverTransferCount,
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
      claim_id: prepared.circuitInputs.claim_id,
      token_address: prepared.circuitInputs.token_address,
      recipient_address: prepared.circuitInputs.recipient_address,
      transfers_count: prepared.proverTransferCount,
    },
  }
}
