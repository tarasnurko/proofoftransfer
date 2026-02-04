import type { EtherscanERC20Transfer } from '@repo/types'
import type { WalletClient } from 'viem'

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
 * Generate a ZK proof for a claim
 * Uses dynamic imports to avoid Turbopack build-time analysis
 */
export async function generateClaimProof(
  params: GenerateClaimProofParams
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

  if (!proverTransfers.length) {
    throw new Error('No transfers found for prover address')
  }

  if (proverTransfers.length > circuitUtils.MAX_TRANSFERS) {
    throw new Error(`Too many transfers. Maximum ${circuitUtils.MAX_TRANSFERS} allowed.`)
  }

  // Validate that all transfers have the expected recipient and token addresses
  const invalidTransfers = allTransfers.filter(
    (t) =>
      t.to.toLowerCase() !== recipientAddress.toLowerCase() ||
      t.contractAddress.toLowerCase() !== tokenAddress.toLowerCase()
  )
  if (invalidTransfers.length) {
    throw new Error(`Found ${invalidTransfers.length} transfers that don't match claim parameters`)
  }

  // Step 2: Build Merkle tree from ALL transfers
  // Process transfers in batches to avoid memory issues
  const BATCH_SIZE = 50
  const allTransferHashes: string[] = []

  for (let i = 0; i < allTransfers.length; i += BATCH_SIZE) {
    const batch = allTransfers.slice(i, i + BATCH_SIZE)
    const batchHashesBytes = await Promise.all(
      batch.map((transfer) => circuitUtils.hashTransfer(api, transfer))
    )

    // Convert Uint8Array hashes to string (bigint string)
    const batchHashes = batchHashesBytes.map((hash) =>
      circuitUtils.fieldToBigint(hash).toString()
    )

    allTransferHashes.push(...batchHashes)
  }

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
  const proverIndices = proverTransfers.map((proverTransfer, i) => {
    const index = allTransfers.findIndex((t) => t.hash === proverTransfer.hash)
    if (index === -1) {
      throw new Error(`Prover transfer not found in all transfers: ${proverTransfer.hash}`)
    }

    // Verify the transfer at this index matches
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

  // Step 5: Construct message for wallet signature
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

  // For future EIP-712 support (requires circuit update)
  const USE_EIP712 = true // Circuit now supports EIP-712 typed data signing

  // Get wallet's chain ID for EIP-712 domain
  const walletChainId = await walletClient.getChainId()

  const messageToSign = circuitUtils.constructClaimMessage({
    claimIdBytes32,
    claimMessageHashBytes32,
    tokenAddressBytes32,
    userAddressBytes32,
    chainId: BigInt(walletChainId),
    claimConstraints,
    merkleTreeRootBytes32,
  })

  // Step 6: Get wallet signature and public key
  if (!walletClient.account) {
    throw new Error('Wallet not connected')
  }

  const account = walletClient.account

  let signature: `0x${string}`

  if (USE_EIP712) {
    // EIP-712 Typed Data Signing (for browser wallets)
    const domain = {
      name: 'ProofOfTransfer',
      version: '1',
      chainId: BigInt(walletChainId), // Use wallet's actual chain ID
      verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
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
      tokenAddress: tokenAddress as `0x${string}`,
      recipientAddress: recipientAddress as `0x${string}`,
      minTransfersSum: claimConstraints.minTransfersSum,
      maxTransfersSum: claimConstraints.maxTransfersSum,
      fromBlockTimestamp: claimConstraints.fromBlockTimestamp,
      toBlockTimestamp: claimConstraints.toBlockTimestamp,
      transfersRootHash: merkleTreeRootBytes32,
    }

    signature = await walletClient.signTypedData({
      account,
      domain,
      types,
      primaryType: 'Claim',
      message,
    })
  } else {
    // Legacy signing (current circuit)
    if ('sign' in account && typeof account.sign === 'function') {
      // Local account - can sign raw hash directly
      signature = await account.sign({ hash: messageToSign })
    } else {
      // Browser wallet - will add Ethereum prefix
      throw new Error(
        'Browser wallets not supported with current circuit. Please use a local account or wait for EIP-712 support.'
      )
    }
  }

  // Step 7: Process signature, extract public key components, and compute nullifier
  const signatureResult = await circuitUtils.processSignature(signature, api)

  // Get public key - try from account first, then recover from signature
  let publicKey: `0x${string}`

  if ('publicKey' in account && account.publicKey) {
    // Local account (testing/development)
    publicKey = account.publicKey
  } else {
    // Browser wallet - recover public key from signature
    const { recoverPublicKey, hashMessage, hashTypedData } = await import('viem')

    let hashToRecover: `0x${string}`

    if (USE_EIP712) {
      // Recover from EIP-712 signature
      const domain = {
        name: 'ProofOfTransfer',
        version: '1',
        chainId: BigInt(walletChainId),
        verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
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
        tokenAddress: tokenAddress as `0x${string}`,
        recipientAddress: recipientAddress as `0x${string}`,
        minTransfersSum: claimConstraints.minTransfersSum,
        maxTransfersSum: claimConstraints.maxTransfersSum,
        fromBlockTimestamp: claimConstraints.fromBlockTimestamp,
        toBlockTimestamp: claimConstraints.toBlockTimestamp,
        transfersRootHash: merkleTreeRootBytes32,
      }

      hashToRecover = hashTypedData({
        domain,
        types,
        primaryType: 'Claim',
        message,
      })
    } else {
      // Legacy: Browser wallets add Ethereum message prefix
      // (This code path won't execute since we now throw error for browser wallets)
      hashToRecover = hashMessage({ raw: messageToSign })
    }

    publicKey = await recoverPublicKey({
      hash: hashToRecover,
      signature,
    })
  }

  const publicKeyComponents = circuitUtils.extractPublicKeyComponents(publicKey)
  const nullifier = signatureResult.nullifier

  // CRITICAL: Verify the public key actually corresponds to the prover address
  // The circuit's ecrecover will derive the address from the public key
  // If this doesn't match proverAddress, the circuit will compute wrong hashes
  const { keccak256, hexToBytes } = await import('viem')
  const publicKeyBytes = hexToBytes(publicKey)
  // Remove the 0x04 prefix (first byte) for uncompressed public key
  const publicKeyWithoutPrefix = publicKeyBytes.slice(1)
  const publicKeyHash = keccak256(publicKeyWithoutPrefix)
  // Ethereum address is the last 20 bytes of the keccak hash
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

  // Calculate are_transfer_leaves_even from path indices
  // pathIndices[i] === 0 means even leaf, === 1 means odd leaf
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

  // Validate constraint satisfaction before sending to circuit
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
    const invalidTransfers = timestampChecks.filter(tc => !tc.satisfies_from || !tc.satisfies_to)
    throw new Error(`Timestamp constraint violation: ${invalidTransfers.length} transfers out of range`)
  }

  if (!sumConstraintsValid) {
    throw new Error(`Sum constraint violation: total ${totalSum} not in range [${minSum}, ${maxSum}]`)
  }

  // Step 9: Generate the proof
  // Cast to any to bypass TypeScript's strict InputMap checking
  // Noir.js will handle the conversion internally
  const { proof, publicInputs } = await generateProofClient(circuitInputs as any)

  // Step 10: Return formatted result
  return {
    proofData: uint8ArrayToHex(proof),
    nullifier: '0x' + BigInt(nullifier).toString(16).padStart(64, '0'),
    publicInputs: publicInputs, // Original array from Noir for verification
    publicInputsFormatted: {
      claim_id: claimMessageHashBigInt.toString(),
      token_address: tokenAddress,
      recipient_address: recipientAddress,
      transfers_count: proverTransfers.length,
    },
    transfersRootHash: '0x' + BigInt(merkleRoot).toString(16).padStart(64, '0'),
  }
}
