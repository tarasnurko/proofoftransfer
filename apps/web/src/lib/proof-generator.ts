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

  // Validate that all transfers have the expected recipient and token addresses
  console.log('Validating transfers match claim parameters:')
  const invalidTransfers = allTransfers.filter(
    (t) =>
      t.to.toLowerCase() !== recipientAddress.toLowerCase() ||
      t.contractAddress.toLowerCase() !== tokenAddress.toLowerCase()
  )
  if (invalidTransfers.length > 0) {
    console.warn(`Found ${invalidTransfers.length} transfers that don't match claim parameters!`, {
      expectedRecipient: recipientAddress,
      expectedToken: tokenAddress,
      firstInvalid: invalidTransfers[0]
        ? {
            to: invalidTransfers[0].to,
            contractAddress: invalidTransfers[0].contractAddress,
          }
        : null,
    })
  } else {
    console.log('All transfers match claim recipient and token ✓')
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

  console.log('Zero values for Merkle tree:', {
    treeHeight: circuitUtils.MERKLE_TREE_HEIGHT,
    zeroLevel0: zeros[0],
    zeroLevel1: zeros[1],
    zeroLevel2: zeros[2],
    totalZeros: zeros.length,
  })

  const merkleTree = new circuitUtils.MerkleTree(
    circuitUtils.MERKLE_TREE_HEIGHT,
    zeros,
    (left, right) => circuitUtils.poseidon2HashStringsLeftRight(api, left, right)
  )

  await merkleTree.init(allTransferHashes)

  const merkleRoot = merkleTree.root()

  console.log('Merkle tree info:', {
    totalTransfers: allTransfers.length,
    proverTransfers: proverTransfers.length,
    merkleRoot,
    firstTransferHash: allTransferHashes[0],
    treeHeight: circuitUtils.MERKLE_TREE_HEIGHT,
  })

  // Log first transfer from allTransfers for debugging
  if (allTransfers[0]) {
    console.log('First transfer in allTransfers:', {
      from: allTransfers[0].from,
      to: allTransfers[0].to,
      value: allTransfers[0].value,
      timeStamp: allTransfers[0].timeStamp,
      hash: allTransfers[0].hash,
    })
  }

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
        console.warn(`Transfer ${i} found at index ${index} but fields don't match!`, {
          expected: {
            from: proverTransfer.from,
            to: proverTransfer.to,
            value: proverTransfer.value,
            timeStamp: proverTransfer.timeStamp,
            contractAddress: proverTransfer.contractAddress,
          },
          found: {
            from: transferAtIndex.from,
            to: transferAtIndex.to,
            value: transferAtIndex.value,
            timeStamp: transferAtIndex.timeStamp,
            contractAddress: transferAtIndex.contractAddress,
          },
        })
      }
    }

    return index
  })

  console.log('Prover transfer indices in allTransfers:', proverIndices)

  const merkleProofs = proverIndices.map((index) => {
    const proof = merkleTree.proof(index)
    console.log(`Merkle proof for index ${index}:`, {
      root: proof.root,
      leaf: proof.leaf,
      pathElements: proof.pathElements.slice(0, 3), // First 3 for debugging
      pathIndices: proof.pathIndices,
    })
    return proof
  })

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
    console.log('🔄 Using EIP-712 typed data signing')

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
      console.log('✓ Using local account signature (no Ethereum prefix)')
    } else {
      // Browser wallet - will add Ethereum prefix
      // This will cause "Cannot satisfy constraint" error with current circuit
      signature = await walletClient.signMessage({
        account,
        message: { raw: messageToSign },
      })
      console.error(
        '❌ Browser wallet detected! Current circuit does not support browser wallets.',
        '\n   Browser wallets add Ethereum message prefix which breaks signature verification.',
        '\n   Solutions:',
        '\n   1. Use a local test account (private key) for now',
        '\n   2. Wait for EIP-712 circuit update (set USE_EIP712 = true when ready)',
      )
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

  console.log('Public key verification:', {
    publicKeyUsed: publicKey,
    proverAddress: proverAddress,
    derivedAddressFromPublicKey: derivedAddress,
    addressesMatch: derivedAddress.toLowerCase() === proverAddress.toLowerCase(),
    WARNING_IF_MISMATCH: derivedAddress.toLowerCase() !== proverAddress.toLowerCase()
      ? '⚠️ PUBLIC KEY DOES NOT MATCH PROVER ADDRESS! This will cause circuit failure!'
      : 'OK',
  })

  // Step 8: Prepare circuit inputs
  const circuitTransfers = circuitUtils.mapToCircuitTransfers(proverTransfers)

  if (proverTransfers[0]) {
    console.log('First prover transfer (original):', {
      from: proverTransfers[0].from,
      to: proverTransfers[0].to,
      value: proverTransfers[0].value,
      timeStamp: proverTransfers[0].timeStamp,
      hash: proverTransfers[0].hash,
    })

    console.log('First circuit transfer (mapped):', circuitTransfers[0])

    // Verify that hashing the first prover transfer gives us the expected leaf
    const firstProverIndex = proverIndices[0]!
    const firstProverHashBytes = await circuitUtils.hashTransfer(api, proverTransfers[0])
    const firstProverHashString = circuitUtils.fieldToBigint(firstProverHashBytes).toString()

    console.log('First prover transfer hash verification:', {
      computedHash: firstProverHashString,
      expectedHashFromTree: allTransferHashes[firstProverIndex],
      merkleProofLeaf: merkleProofs[0]?.leaf,
      match: firstProverHashString === allTransferHashes[firstProverIndex],
    })
  }

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

  console.log('First proof are_transfer_leaves_even:', areTransferLeavesEven[0])

  // Detailed Merkle proof structure logging
  if (paddedMerkleProofs[0]) {
    console.log('Detailed first Merkle proof structure:', {
      leafIndex: proverIndices[0],
      leafHash: paddedMerkleProofs[0].leaf,
      rootFromProof: paddedMerkleProofs[0].root,
      firstFivePathElements: paddedMerkleProofs[0].pathElements.slice(0, 5),
      firstFivePathIndices: paddedMerkleProofs[0].pathIndices.slice(0, 5),
      firstFiveAreEven: areTransferLeavesEven[0]?.slice(0, 5),
    })

    // Manually verify first level of Merkle proof
    const leafHash = paddedMerkleProofs[0].leaf
    const firstSibling = paddedMerkleProofs[0].pathElements[0]
    const isEven = areTransferLeavesEven[0]?.[0]

    console.log('Manual verification of first hash step:', {
      leafHash,
      firstSibling,
      isEven,
      hashOrder: isEven ? '[leaf, sibling]' : '[sibling, leaf]',
    })

    // Compute first level hash to verify
    const [left, right] = isEven ? [leafHash, firstSibling!] : [firstSibling!, leafHash]
    const firstLevelHash = await circuitUtils.poseidon2HashStringsLeftRight(api, left, right)
    console.log('First level hash result:', firstLevelHash)

    // Simulate what the circuit should compute
    // The circuit will hash the transfer data to get the leaf
    if (proverTransfers[0]) {
      const circuitLeafHash = await circuitUtils.hashTransfer(api, proverTransfers[0])
      const circuitLeafHashString = circuitUtils.fieldToBigint(circuitLeafHash).toString()

      console.log('What circuit should compute:', {
        circuitShouldComputeLeafHash: circuitLeafHashString,
        matchesOurLeafHash: circuitLeafHashString === leafHash,
        proverAddressBigInt: BigInt(proverAddress).toString(),
        recipientAddressBigInt: BigInt(recipientAddress).toString(),
        tokenAddressBigInt: BigInt(tokenAddress).toString(),
      })
    }

    // Walk up the tree manually to see if we can replicate the circuit's computation
    let currentHash = leafHash
    const pathElements = paddedMerkleProofs[0].pathElements
    const pathIndices = areTransferLeavesEven[0] || []

    console.log('Manual Merkle root computation (simulating circuit):')
    for (let i = 0; i < Math.min(3, pathElements.length); i++) {
      const sibling = pathElements[i]!
      const isEven = pathIndices[i]
      const [l, r] = isEven ? [currentHash, sibling] : [sibling, currentHash]
      currentHash = await circuitUtils.poseidon2HashStringsLeftRight(api, l, r)
      console.log(`Level ${i}: isEven=${isEven}, hash=${currentHash.substring(0, 20)}...`)
    }
  }

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

  console.log('Circuit inputs - addresses as they will be sent:', {
    token_address: circuitInputs.token_address,
    token_address_bigint: BigInt(tokenAddress).toString(),
    recipient_address: circuitInputs.recipient_address,
    recipient_address_bigint: BigInt(recipientAddress).toString(),
    transfers_root_hash: circuitInputs.transfers_root_hash,
  })

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

  const constraintCheck = {
    transfers_count: proverTransfers.length,
    total_sum: totalSum.toString(),
    min_sum_constraint: minSum.toString(),
    max_sum_constraint: maxSum.toString(),
    sum_satisfies_min: minSum === 0n || totalSum >= minSum,
    sum_satisfies_max: maxSum === 0n || totalSum <= maxSum,
    from_timestamp_constraint: fromTimestamp.toString(),
    to_timestamp_constraint: toTimestamp.toString(),
    all_transfers_timestamps: timestampChecks,
    ALL_CONSTRAINTS_SATISFIED: allTimestampsValid && sumConstraintsValid,
  }

  console.log('Checking circuit constraints BEFORE proof generation:')
  console.log(JSON.stringify(constraintCheck, null, 2))

  if (!allTimestampsValid) {
    console.error('❌ TIMESTAMP CONSTRAINT VIOLATION:')
    console.error(JSON.stringify(timestampChecks.filter(tc => !tc.satisfies_from || !tc.satisfies_to), null, 2))
  }

  if (!sumConstraintsValid) {
    console.error('❌ SUM CONSTRAINT VIOLATION:')
    console.error(JSON.stringify({
      totalSum: totalSum.toString(),
      minRequired: minSum.toString(),
      maxAllowed: maxSum.toString(),
    }, null, 2))
  }

  console.log('Circuit inputs prepared:', {
    transfers_root_hash: merkleRoot,
    transfers_count: paddedTransfers.length,
    actual_transfers: proverTransfers.length,
    first_transfer: circuitTransfers[0],
    first_proof_elements_count: paddedMerkleProofs[0]?.pathElements.length,
  })

  if (proverTransfers[0]) {
    console.log('Critical: Address values for hash verification:', {
      proverAddress: proverAddress,
      recipientAddress: recipientAddress,
      tokenAddress: tokenAddress,
      firstProverTransfer_from: proverTransfers[0].from,
      firstProverTransfer_to: proverTransfers[0].to,
      firstProverTransfer_contractAddress: proverTransfers[0].contractAddress,
      addressesMatch: {
        from: proverTransfers[0].from.toLowerCase() === proverAddress.toLowerCase(),
        to: proverTransfers[0].to.toLowerCase() === recipientAddress.toLowerCase(),
        token:
          proverTransfers[0].contractAddress.toLowerCase() === tokenAddress.toLowerCase(),
      },
    })
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
