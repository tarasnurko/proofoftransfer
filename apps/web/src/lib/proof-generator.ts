import type { EtherscanERC20Transfer } from '@repo/types'
import type { Address, WalletClient } from 'viem'

export interface GenerateClaimProofParams {
  claimId: string
  claimMessage: string
  tokenAddress: string
  recipientAddress: string
  minTransfersSum: string
  maxTransfersSum: string
  fromBlockTimestamp: number
  toBlockTimestamp: number
  allTransfers: EtherscanERC20Transfer[]
  proverAddress: string
  walletClient: WalletClient
}

export interface PreparedProofData {
  circuitInputs: any
  nullifier: string
  transfersRootHash: string
  proverTransferCount: number
}

export interface GeneratedProof {
  proofData: string
  nullifier: string
  publicInputs: any // Original Noir public inputs array for verification
  publicInputsFormatted: {
    claim_id: string
    token_address: string
    recipient_address: string
    transfers_count: number
  }
  transfersRootHash: string
}

/**
 * Phase 1: Prepare proof data — build merkle tree, sign EIP-712 message, compute nullifier.
 * Returns prepared data needed for ZK proof generation.
 */
export async function prepareClaimProof(
  params: GenerateClaimProofParams
): Promise<PreparedProofData> {
  const [
    { Barretenberg },
    circuitUtils,
  ] = await Promise.all([
    import('@aztec/bb.js'),
    import('@repo/circuit-utils'),
  ])

  const {
    claimId,
    claimMessage,
    tokenAddress,
    recipientAddress,
    minTransfersSum,
    maxTransfersSum,
    fromBlockTimestamp,
    toBlockTimestamp,
    allTransfers,
    proverAddress,
    walletClient,
  } = params

  const api = await Barretenberg.new({ threads: 1 })

  // Step 1: Filter prover's transfers
  const proverTransfers = allTransfers.filter(
    (t) => t.from.toLowerCase() === proverAddress.toLowerCase()
  )

  if (!proverTransfers.length) {
    throw new Error('No transfers found for prover address')
  }

  if (proverTransfers.length > circuitUtils.MAX_TRANSFERS) {
    throw new Error(`Too many transfers. Maximum ${circuitUtils.MAX_TRANSFERS} allowed.`)
  }

  const invalidTransfers = allTransfers.filter(
    (t) =>
      t.to.toLowerCase() !== recipientAddress.toLowerCase() ||
      t.contractAddress.toLowerCase() !== tokenAddress.toLowerCase()
  )
  if (invalidTransfers.length) {
    throw new Error(`Found ${invalidTransfers.length} transfers that don't match claim parameters`)
  }

  // Step 2: Build Merkle tree
  const BATCH_SIZE = 50
  const allTransferHashes: string[] = []

  for (let i = 0; i < allTransfers.length; i += BATCH_SIZE) {
    const batch = allTransfers.slice(i, i + BATCH_SIZE)
    const batchHashesBytes = await Promise.all(
      batch.map((transfer) => circuitUtils.hashTransfer(api, transfer))
    )
    const batchHashes = batchHashesBytes.map((hash) =>
      circuitUtils.fieldToBigint(hash).toString()
    )
    allTransferHashes.push(...batchHashes)
  }

  const zeros: string[] = []
  let currentZero = '0'
  zeros.push(currentZero)
  for (let i = 0; i < circuitUtils.MERKLE_TREE_HEIGHT; i++) {
    currentZero = await circuitUtils.poseidon2HashStringsLeftRight(api, currentZero, currentZero)
    zeros.push(currentZero)
  }

  const merkleTree = new circuitUtils.MerkleTree(
    circuitUtils.MERKLE_TREE_HEIGHT,
    zeros,
    (left, right) => circuitUtils.poseidon2HashStringsLeftRight(api, left, right)
  )

  await merkleTree.init(allTransferHashes)
  const merkleRoot = merkleTree.root()

  // Step 3: Merkle proofs for prover's transfers
  const proverIndices = proverTransfers.map((proverTransfer, i) => {
    const index = allTransfers.findIndex((t) => t.hash === proverTransfer.hash)
    if (index === -1) {
      throw new Error(`Prover transfer not found in all transfers: ${proverTransfer.hash}`)
    }
    const transferAtIndex = allTransfers[index]
    if (transferAtIndex) {
      const matches =
        transferAtIndex.from === proverTransfer.from &&
        transferAtIndex.to === proverTransfer.to &&
        transferAtIndex.value === proverTransfer.value &&
        transferAtIndex.timeStamp === proverTransfer.timeStamp &&
        transferAtIndex.contractAddress === proverTransfer.contractAddress
      if (!matches) {
        throw new Error(`Transfer ${i} found at index ${index} but fields don't match`)
      }
    }
    return index
  })

  const merkleProofs = proverIndices.map((index) => merkleTree.proof(index))

  // Step 4: Compute claim message hash
  const claimMessageHashBytes = await circuitUtils.hashString(api, claimMessage)
  const claimMessageHashBigInt = BigInt('0x' + Buffer.from(claimMessageHashBytes).toString('hex'))
  const claimMessageHashBytes32 = circuitUtils.bigintToBytes32(claimMessageHashBigInt)

  // Step 5: Construct EIP-712 message
  const claimIdBytes32 = circuitUtils.uuidToBytes32(claimId)
  const tokenAddressBytes32 = circuitUtils.addressToBytes32(tokenAddress)
  const userAddressBytes32 = circuitUtils.addressToBytes32(recipientAddress)
  const merkleTreeRootBytes32 = circuitUtils.bigintToBytes32(merkleRoot)

  const claimConstraints = {
    minTransfersSum: BigInt(minTransfersSum || '0'),
    maxTransfersSum: BigInt(maxTransfersSum || '0'),
    fromBlockTimestamp: BigInt(fromBlockTimestamp || 0),
    toBlockTimestamp: BigInt(toBlockTimestamp || 0),
  }

  const walletChainId = await walletClient.getChainId()

  // Step 6: Sign EIP-712 typed data
  if (!walletClient.account) {
    throw new Error('Wallet not connected')
  }

  const account = walletClient.account

  const domain = {
    name: 'ProofOfTransfer',
    version: '1',
    chainId: BigInt(walletChainId),
    verifyingContract: '0x0000000000000000000000000000000000000000' as Address,
  } as const

  const types = {
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

  const message = {
    claimId: claimIdBytes32,
    claimMessageHash: claimMessageHashBytes32,
    tokenAddress: tokenAddress as Address,
    recipientAddress: recipientAddress as Address,
    minTransfersSum: claimConstraints.minTransfersSum,
    maxTransfersSum: claimConstraints.maxTransfersSum,
    fromBlockTimestamp: claimConstraints.fromBlockTimestamp,
    toBlockTimestamp: claimConstraints.toBlockTimestamp,
    transfersRootHash: merkleTreeRootBytes32,
  }

  const signature = await walletClient.signTypedData({
    account,
    domain,
    types,
    primaryType: 'Claim',
    message,
  })

  // Step 7: Process signature, extract public key, compute nullifier
  const signatureResult = await circuitUtils.processSignature(signature, api)

  let publicKey: Address

  if ('publicKey' in account && account.publicKey) {
    publicKey = account.publicKey
  } else {
    const { recoverPublicKey, hashTypedData } = await import('viem')

    const hashToRecover = hashTypedData({
      domain,
      types,
      primaryType: 'Claim',
      message,
    })

    publicKey = await recoverPublicKey({
      hash: hashToRecover,
      signature,
    })
  }

  const publicKeyComponents = circuitUtils.extractPublicKeyComponents(publicKey)
  const nullifier = signatureResult.nullifier

  // Verify public key matches prover address
  const { keccak256, hexToBytes } = await import('viem')
  const publicKeyBytes = hexToBytes(publicKey)
  const publicKeyWithoutPrefix = publicKeyBytes.slice(1)
  const publicKeyHash = keccak256(publicKeyWithoutPrefix)
  const derivedAddress = '0x' + publicKeyHash.slice(-40)

  if (derivedAddress.toLowerCase() !== proverAddress.toLowerCase()) {
    throw new Error('Public key does not match prover address')
  }

  // Step 8: Prepare circuit inputs
  const circuitTransfers = circuitUtils.mapToCircuitTransfers(proverTransfers)
  const paddedTransfers = circuitUtils.padTransfersArray(circuitTransfers, circuitUtils.MAX_TRANSFERS)
  const paddedMerkleProofs = circuitUtils.padMerkleProofsArray(
    merkleProofs,
    circuitUtils.MAX_TRANSFERS,
    circuitUtils.MERKLE_TREE_HEIGHT
  )

  const areTransferLeavesEven = paddedMerkleProofs.map((mp) =>
    mp.pathIndices.map((idx) => idx === 0)
  )

  const circuitInputs = {
    claim_id: claimIdBytes32,
    claim_message_hash: claimMessageHashBytes32,
    token_address: tokenAddress,
    recipient_address: recipientAddress,
    chain_id: walletChainId.toString(),
    min_transfers_sum: claimConstraints.minTransfersSum.toString(),
    max_transfers_sum: claimConstraints.maxTransfersSum.toString(),
    from_block_timestamp: claimConstraints.fromBlockTimestamp.toString(),
    to_block_timestamp: claimConstraints.toBlockTimestamp.toString(),
    transfers_root_hash: merkleRoot,
    nullifier: nullifier,
    transfers: paddedTransfers,
    transfers_proofs: paddedMerkleProofs.map((mp) => mp.pathElements),
    are_transfer_leaves_even: areTransferLeavesEven,
    transfers_amount: proverTransfers.length.toString(),
    prover_pub_key_x: publicKeyComponents.pubKeyX,
    prover_pub_key_y: publicKeyComponents.pubKeyY,
    prover_signature: signatureResult.fullSignature,
  }

  // Validate constraints before circuit
  const totalSum = proverTransfers.reduce((sum, t) => sum + BigInt(t.value), 0n)
  const minSum = claimConstraints.minTransfersSum
  const maxSum = claimConstraints.maxTransfersSum
  const fromTimestamp = claimConstraints.fromBlockTimestamp
  const toTimestamp = claimConstraints.toBlockTimestamp

  const timestampChecks = proverTransfers.map(t => ({
    timestamp: t.timeStamp,
    satisfies_from: fromTimestamp === 0n || BigInt(t.timeStamp) >= fromTimestamp,
    satisfies_to: toTimestamp === 0n || BigInt(t.timeStamp) <= toTimestamp,
  }))

  const allTimestampsValid = timestampChecks.every(tc => tc.satisfies_from && tc.satisfies_to)
  const sumConstraintsValid = (minSum === 0n || totalSum >= minSum) && (maxSum === 0n || totalSum <= maxSum)

  if (!allTimestampsValid) {
    const invalid = timestampChecks.filter(tc => !tc.satisfies_from || !tc.satisfies_to)
    throw new Error(`Timestamp constraint violation: ${invalid.length} transfers out of range`)
  }

  if (!sumConstraintsValid) {
    throw new Error(`Sum constraint violation: total ${totalSum} not in range [${minSum}, ${maxSum}]`)
  }

  return {
    circuitInputs,
    nullifier: '0x' + BigInt(nullifier).toString(16).padStart(64, '0'),
    transfersRootHash: '0x' + BigInt(merkleRoot).toString(16).padStart(64, '0'),
    proverTransferCount: proverTransfers.length,
  }
}

/**
 * Assemble PreparedProofData from server-prepared signing/circuit data + client-side signature results.
 */
export interface ServerSigningData {
  eip712: {
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
  circuitData: {
    merkleRoot: string
    claimIdBytes32: `0x${string}`
    claimMessageHashBytes32: `0x${string}`
    paddedTransfers: any[]
    paddedMerkleProofElements: any[]
    areTransferLeavesEven: boolean[][]
    proverTransferCount: number
  }
}

export interface SignatureResult {
  nullifier: string
  fullSignature: number[]
}

export function assembleCircuitInputs(
  serverData: ServerSigningData,
  signatureResult: SignatureResult,
  walletChainId: number,
  publicKeyComponents: { pubKeyX: number[]; pubKeyY: number[] },
): PreparedProofData {
  const { eip712, circuitData } = serverData

  const circuitInputs = {
    claim_id: circuitData.claimIdBytes32,
    claim_message_hash: circuitData.claimMessageHashBytes32,
    token_address: eip712.tokenAddress,
    recipient_address: eip712.recipientAddress,
    chain_id: walletChainId.toString(),
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
  }

  return {
    circuitInputs,
    nullifier: '0x' + BigInt(signatureResult.nullifier).toString(16).padStart(64, '0'),
    transfersRootHash: '0x' + BigInt(circuitData.merkleRoot).toString(16).padStart(64, '0'),
    proverTransferCount: circuitData.proverTransferCount,
  }
}

/**
 * Phase 2: Generate ZK proof from prepared data.
 */
export async function generateProofFromPrepared(
  prepared: PreparedProofData
): Promise<GeneratedProof> {
  const { generateProofClient, uint8ArrayToHex } = await import('./circuit-client')

  const { proof, publicInputs } = await generateProofClient(prepared.circuitInputs as any)

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
    transfersRootHash: prepared.transfersRootHash,
  }
}

/**
 * Full flow: prepare + generate in one call (backwards-compatible).
 */
export async function generateClaimProof(
  params: GenerateClaimProofParams
): Promise<GeneratedProof> {
  const prepared = await prepareClaimProof(params)
  return generateProofFromPrepared(prepared)
}
