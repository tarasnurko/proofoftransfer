import type { Address, WalletClient } from 'viem'
import { recoverPublicKey, hashTypedData, keccak256, hexToBytes, isAddressEqual } from 'viem'
import { processSignatureAction } from '@/actions/proofs.actions'

export const CLAIM_TYPES = {
  Claim: [
    { name: 'claimId', type: 'bytes32' },
    { name: 'claimMessageHash', type: 'bytes32' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'recipientAddress', type: 'address' },
    { name: 'minTransfersSum', type: 'uint128' },
    { name: 'maxTransfersSum', type: 'uint128' },
    { name: 'fromBlockTimestamp', type: 'uint64' },
    { name: 'toBlockTimestamp', type: 'uint64' },
    { name: 'transfersRootHash', type: 'bytes32' },
  ],
} as const

export interface Eip712ClaimFields {
  claimIdBytes32: `0x${string}`
  claimMessageHashBytes32: `0x${string}`
  tokenAddress: string
  recipientAddress: string
  minTransfersSum: string
  maxTransfersSum: string
  fromBlockTimestamp: string
  toBlockTimestamp: string
  merkleTreeRootBytes32: `0x${string}`
}

export function buildClaimDomain(chainId: number) {
  return {
    name: 'ProofOfTransfer',
    version: '1',
    chainId: BigInt(chainId),
    verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  }
}

export function buildClaimMessage(eip712: Eip712ClaimFields) {
  return {
    claimId: eip712.claimIdBytes32,
    claimMessageHash: eip712.claimMessageHashBytes32,
    tokenAddress: eip712.tokenAddress as `0x${string}`,
    recipientAddress: eip712.recipientAddress as `0x${string}`,
    minTransfersSum: BigInt(eip712.minTransfersSum),
    maxTransfersSum: BigInt(eip712.maxTransfersSum),
    fromBlockTimestamp: BigInt(eip712.fromBlockTimestamp),
    toBlockTimestamp: BigInt(eip712.toBlockTimestamp),
    transfersRootHash: eip712.merkleTreeRootBytes32,
  }
}

export interface SignClaimResult {
  signature: `0x${string}`
  nullifier: string
  fullSignature: number[]
  walletChainId: number
  domain: ReturnType<typeof buildClaimDomain>
  message: ReturnType<typeof buildClaimMessage>
}

export async function signClaimAndDeriveNullifier(
  walletClient: WalletClient,
  eip712: Eip712ClaimFields,
): Promise<SignClaimResult> {
  const walletChainId = await walletClient.getChainId()
  const domain = buildClaimDomain(walletChainId)
  const message = buildClaimMessage(eip712)

  const signature = await walletClient.signTypedData({
    account: walletClient.account!,
    domain,
    types: CLAIM_TYPES,
    primaryType: 'Claim',
    message,
  })

  const sigResult = await processSignatureAction({ signature })
  if (sigResult?.serverError) throw new Error(sigResult.serverError)
  if (!sigResult?.data) throw new Error('Failed to process signature')

  return {
    signature,
    nullifier: sigResult.data.nullifier,
    fullSignature: sigResult.data.fullSignature,
    walletChainId,
    domain,
    message,
  }
}

export async function recoverAndVerifyPublicKey(
  signature: `0x${string}`,
  domain: ReturnType<typeof buildClaimDomain>,
  message: ReturnType<typeof buildClaimMessage>,
  expectedAddress: string,
): Promise<{ pubKeyX: number[]; pubKeyY: number[] }> {
  const hash = hashTypedData({
    domain,
    types: CLAIM_TYPES,
    primaryType: 'Claim',
    message,
  })

  const publicKey = await recoverPublicKey({ hash, signature })
  const pkBytes = hexToBytes(publicKey)
  const pkHash = keccak256(pkBytes.slice(1))
  const derivedAddress = '0x' + pkHash.slice(-40)

  if (!isAddressEqual(derivedAddress as Address, expectedAddress as Address)) {
    throw new Error('Public key does not match prover address')
  }

  return {
    pubKeyX: Array.from(pkBytes.slice(1, 33)),
    pubKeyY: Array.from(pkBytes.slice(33, 65)),
  }
}
