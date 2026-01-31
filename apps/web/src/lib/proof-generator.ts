import type { EtherscanERC20Transfer } from '@repo/types'
import type { WalletClient } from 'viem'

export interface ProofGenerationParams {
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

export interface GeneratedProof {
  proofData: string
  nullifier: string
  publicInputs: {
    claim_id: string
    token_address: string
    recipient_address: string
    transfers_count: number
  }
  transfersRootHash: string
}

/**
 * Generate a ZK proof for a claim
 * Uses dynamic imports to avoid Turbopack build-time analysis
 */
export async function generateClaimProof(
  params: ProofGenerationParams
): Promise<GeneratedProof> {
  // Dynamic imports to avoid Turbopack analyzing dependencies at build time
  const [
    { Barretenberg },
    circuitUtils,
    { generateProofClient, uint8ArrayToHex },
  ] = await Promise.all([
    import('@aztec/bb.js'),
    import('@repo/circuit-utils'),
    import('./circuit-client'),
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

  // Initialize Barretenberg API for hashing
  const api = await Barretenberg.new({ threads: 1 })

  // Step 1: Filter prover's transfers
  const proverTransfers = allTransfers.filter(
    (t) => t.from.toLowerCase() === proverAddress.toLowerCase()
  )

  if (proverTransfers.length === 0) {
    throw new Error('No transfers found for prover address')
  }

  if (proverTransfers.length > circuitUtils.MAX_TRANSFERS) {
    throw new Error(`Too many transfers. Maximum ${circuitUtils.MAX_TRANSFERS} allowed.`)
  }

  // Step 2: Build Merkle tree from ALL transfers
  const allTransferHashesBytes = await Promise.all(
    allTransfers.map((transfer) => circuitUtils.hashTransfer(api, transfer))
  )

  // Convert Uint8Array hashes to string (bigint string)
  const allTransferHashes = allTransferHashesBytes.map((hash) =>
    circuitUtils.fieldToBigint(hash).toString()
  )

  // Generate zero values for the merkle tree
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

  // Step 3: Generate merkle proofs for prover's transfers
  const proverIndices = proverTransfers.map((proverTransfer) =>
    allTransfers.findIndex((t) => t.hash === proverTransfer.hash)
  )

  const merkleProofs = proverIndices.map((index) => merkleTree.proof(index))

  // Step 4: Compute claim message hash
  const claimMessageHashBytes = await circuitUtils.hashString(api, claimMessage)
  const claimMessageHashBigInt = BigInt('0x' + Buffer.from(claimMessageHashBytes).toString('hex'))

  // Step 5: Construct message for wallet signature
  const claimConstraints = {
    minTransfersSum: BigInt(minTransfersSum || '0'),
    maxTransfersSum: BigInt(maxTransfersSum || '0'),
    fromBlockTimestamp: BigInt(fromBlockTimestamp || 0),
    toBlockTimestamp: BigInt(toBlockTimestamp || 0),
  }

  const messageToSign = circuitUtils.constructClaimMessage({
    claimIdBytes32: circuitUtils.uuidToBytes32(claimId),
    claimMessageHashBytes32: circuitUtils.bigintToBytes32(claimMessageHashBigInt),
    tokenAddressBytes32: circuitUtils.addressToBytes32(tokenAddress),
    userAddressBytes32: circuitUtils.addressToBytes32(recipientAddress),
    claimConstraints,
    merkleTreeRootBytes32: circuitUtils.bigintToBytes32(merkleRoot),
  })

  // Step 6: Get wallet signature
  if (!walletClient.account) {
    throw new Error('Wallet not connected')
  }

  const signature = await walletClient.signMessage({
    account: walletClient.account,
    message: { raw: messageToSign },
  })

  // Step 7: Process signature and compute nullifier
  const signatureResult = await circuitUtils.processSignature(signature, api)
  const signatureBytes = signatureResult.fullSignature
  const nullifier = signatureResult.nullifier

  // Step 8: Prepare circuit inputs
  const circuitTransfers = circuitUtils.mapToCircuitTransfers(proverTransfers)
  const paddedTransfers = circuitUtils.padTransfersArray(circuitTransfers, circuitUtils.MAX_TRANSFERS)
  const paddedMerkleProofs = circuitUtils.padMerkleProofsArray(
    merkleProofs,
    circuitUtils.MAX_TRANSFERS,
    circuitUtils.MERKLE_TREE_HEIGHT
  )

  const circuitInputs = {
    claim_id: claimMessageHashBigInt.toString(),
    token_address: BigInt(tokenAddress).toString(),
    recipient_address: BigInt(recipientAddress).toString(),
    min_transfers_sum: claimConstraints.minTransfersSum.toString(),
    max_transfers_sum: claimConstraints.maxTransfersSum.toString(),
    from_block_timestamp: claimConstraints.fromBlockTimestamp.toString(),
    to_block_timestamp: claimConstraints.toBlockTimestamp.toString(),
    merkle_root: merkleRoot,
    signature: signatureBytes,
    transfers: paddedTransfers,
    merkle_proofs: paddedMerkleProofs.map((mp) => ({
      path_elements: mp.pathElements,
      path_indices: mp.pathIndices,
    })),
    transfers_count: proverTransfers.length,
  }

  // Step 9: Generate the proof
  // Cast to any to bypass TypeScript's strict InputMap checking
  // Noir.js will handle the conversion internally
  const { proof, publicInputs } = await generateProofClient(circuitInputs as any)

  // Step 10: Return formatted result
  return {
    proofData: uint8ArrayToHex(proof),
    nullifier: '0x' + BigInt(nullifier).toString(16).padStart(64, '0'),
    publicInputs: {
      claim_id: claimMessageHashBigInt.toString(),
      token_address: tokenAddress,
      recipient_address: recipientAddress,
      transfers_count: proverTransfers.length,
    },
    transfersRootHash: '0x' + BigInt(merkleRoot).toString(16).padStart(64, '0'),
  }
}
