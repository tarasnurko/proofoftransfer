'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Barretenberg } from '@aztec/bb.js'
import { actionClient } from '@/lib/safe-action'
import { returnValidationErrors } from 'next-safe-action'
import { submitProofSchema } from '@/lib/validations/proof'
import { getClaimById } from '@/db/queries/claims'
import { getTransfersForClaim } from '@/db/queries/transfers'
import { createProof, checkNullifierExists, getProofById } from '@/db/queries/proofs'
import { createVerification } from '@/db/queries/verifications'
import { etherscanClient } from '@/lib/etherscan'
import type { InsertProofEntity } from '@/db/index.types'
import { verifyProofServer } from '@/lib/proof-verifier-server'
import {
  hashString,
  hashTransfer,
  MerkleTree,
  poseidon2HashStringsLeftRight,
  MERKLE_TREE_HEIGHT,
  ZERO_VALUES,
  MAX_TRANSFERS,
  fieldToBigint,
  uuidToBytes32,
  addressToBytes32,
  bigintToBytes32,
  mapToCircuitTransfers,
  padTransfersArray,
  padMerkleProofsArray,
  processSignature,
} from '@repo/circuit-utils'

const proofIdSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
})

const claimIdSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID format'),
})

export const fetchTransfersAction = actionClient
  .inputSchema(claimIdSchema)
  .action(async ({ parsedInput: { claimId } }) => {
    const claim = await getClaimById(claimId)

    if (!claim) {
      throw new Error('Claim not found')
    }

    const transfers = await etherscanClient.fetchERC20Transfers({
      chainId: claim.chainId,
      tokenAddress: claim.tokenAddress,
      recipientAddress: claim.recipientAddress,
      fromTimestamp: claim.fromBlockTimestamp || undefined,
      toTimestamp: claim.toBlockTimestamp || undefined,
    })

    return { transfers }
  })

export const submitProofAction = actionClient
  .inputSchema(submitProofSchema)
  .action(async ({ parsedInput }) => {
    const claim = await getClaimById(parsedInput.claimId)
    if (!claim) {
      return returnValidationErrors(submitProofSchema, {
        claimId: { _errors: ['Claim not found'] },
      })
    }

    const nullifierExists = await checkNullifierExists(parsedInput.claimId, parsedInput.nullifier)

    if (nullifierExists) {
      return returnValidationErrors(submitProofSchema, {
        nullifier: { _errors: ['This proof has already been submitted for this claim'] },
      })
    }

    const proofData: InsertProofEntity = {
      claimId: parsedInput.claimId,
      nullifier: parsedInput.nullifier,
      proofData: parsedInput.proofData,
      publicInputs: parsedInput.publicInputs,
      transfersRootHash: parsedInput.transfersRootHash,
    }

    const result = await createProof(proofData)

    revalidatePath(`/claims/${parsedInput.claimId}`)
    revalidatePath('/')

    return { proofId: result.id }
  })

export const verifyProofAction = actionClient
  .inputSchema(proofIdSchema)
  .action(async ({ parsedInput: { id: proofId } }) => {
    const proof = await getProofById(proofId)

    if (!proof) {
      throw new Error('Proof not found')
    }

    const claim = await getClaimById(proof.claimId)
    if (!claim) {
      throw new Error('Claim not found')
    }

    const verification = await verifyProofServer({
      proofData: proof.proofData,
      publicInputs: proof.publicInputs as string[],
      claimId: claim.id,
      transfersRootHash: proof.transfersRootHash,
    })

    const isValid = verification.isValid
    const errorMessage = verification.error

    try {
      await createVerification({
        proofId: proofId,
        isValid: isValid,
        errorMessage: errorMessage || null,
      })
    } catch {
      // verification recording is non-critical
    }

    return { isValid, error: errorMessage }
  })

const prepareSigningSchema = z.object({
  claimId: z.string().uuid(),
  proverAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
})

export const prepareClaimSigningDataAction = actionClient
  .inputSchema(prepareSigningSchema)
  .action(async ({ parsedInput: { claimId, proverAddress } }) => {
    const claim = await getClaimById(claimId)
    if (!claim) throw new Error('Claim not found')

    const claimTransfers = await getTransfersForClaim(claimId)
    if (!claimTransfers.length) throw new Error('No transfers found for this claim')

    const api = await Barretenberg.new({ threads: 1 })

    // Hash all transfers & build merkle tree
    const transferHashesBytes = await Promise.all(
      claimTransfers.map(({ transfers: t }) =>
        hashTransfer(api, {
          from: t.senderAddress,
          to: t.recipientAddress,
          contractAddress: t.tokenAddress,
          value: t.amount,
          timeStamp: t.blockTimestamp.toString(),
        })
      )
    )
    const transferHashes = transferHashesBytes.map((h) => fieldToBigint(h).toString())

    const merkleTree = new MerkleTree(
      MERKLE_TREE_HEIGHT,
      ZERO_VALUES,
      (left, right) => poseidon2HashStringsLeftRight(api, left, right)
    )
    await merkleTree.init(transferHashes)
    const merkleRoot = merkleTree.root()

    // Find prover's transfers and compute merkle proofs
    const proverIndices: number[] = []
    const proverTransferData: Array<{ from: string; to: string; contractAddress: string; value: string; timeStamp: string; hash: string }> = []

    claimTransfers.forEach(({ transfers: t }, index) => {
      if (t.senderAddress.toLowerCase() === proverAddress.toLowerCase()) {
        proverIndices.push(index)
        proverTransferData.push({
          from: t.senderAddress,
          to: t.recipientAddress,
          contractAddress: t.tokenAddress,
          value: t.amount,
          timeStamp: t.blockTimestamp.toString(),
          hash: t.txHash,
        })
      }
    })

    if (!proverIndices.length) throw new Error('No transfers found for prover address')
    if (proverIndices.length > MAX_TRANSFERS) throw new Error(`Too many transfers. Maximum ${MAX_TRANSFERS} allowed.`)

    const merkleProofs = proverIndices.map((index) => merkleTree.proof(index))

    // Compute claim message hash
    const claimMessageHashBytes = await hashString(api, claim.message)
    const claimMessageHashBigInt = BigInt('0x' + Buffer.from(claimMessageHashBytes).toString('hex'))
    const claimMessageHashBytes32 = bigintToBytes32(claimMessageHashBigInt)

    // Compute bytes32 values for EIP-712
    const claimIdBytes32 = uuidToBytes32(claimId)
    const merkleTreeRootBytes32 = bigintToBytes32(merkleRoot)

    const claimConstraints = {
      minTransfersSum: claim.minTransfersSum,
      maxTransfersSum: claim.maxTransfersSum,
      fromBlockTimestamp: claim.fromBlockTimestamp,
      toBlockTimestamp: claim.toBlockTimestamp,
    }

    // Prepare circuit transfer data
    const circuitTransfers = mapToCircuitTransfers(proverTransferData as any)
    const paddedTransfers = padTransfersArray(circuitTransfers, MAX_TRANSFERS)
    const paddedMerkleProofs = padMerkleProofsArray(merkleProofs, MAX_TRANSFERS, MERKLE_TREE_HEIGHT)
    const areTransferLeavesEven = paddedMerkleProofs.map((mp) =>
      mp.pathIndices.map((idx) => idx === 0)
    )

    // Validate constraints
    const totalSum = proverTransferData.reduce((sum, t) => sum + BigInt(t.value), 0n)
    const minSum = BigInt(claim.minTransfersSum || '0')
    const maxSum = BigInt(claim.maxTransfersSum || '0')
    const fromTs = BigInt(claim.fromBlockTimestamp || 0)
    const toTs = BigInt(claim.toBlockTimestamp || 0)

    for (const t of proverTransferData) {
      const ts = BigInt(t.timeStamp)
      if (fromTs && ts < fromTs) throw new Error('Transfer timestamp before fromBlockTimestamp')
      if (toTs && ts > toTs) throw new Error('Transfer timestamp after toBlockTimestamp')
    }
    if (minSum && totalSum < minSum) throw new Error(`Sum ${totalSum} below minimum ${minSum}`)
    if (maxSum && totalSum > maxSum) throw new Error(`Sum ${totalSum} above maximum ${maxSum}`)

    return {
      eip712: {
        claimIdBytes32,
        claimMessageHashBytes32,
        tokenAddress: claim.tokenAddress,
        recipientAddress: claim.recipientAddress,
        minTransfersSum: (BigInt(claim.minTransfersSum || '0')).toString(),
        maxTransfersSum: (BigInt(claim.maxTransfersSum || '0')).toString(),
        fromBlockTimestamp: (BigInt(claim.fromBlockTimestamp || 0)).toString(),
        toBlockTimestamp: (BigInt(claim.toBlockTimestamp || 0)).toString(),
        merkleTreeRootBytes32,
      },
      circuitData: {
        merkleRoot,
        claimIdBytes32,
        claimMessageHashBytes32,
        paddedTransfers,
        paddedMerkleProofElements: paddedMerkleProofs.map((mp) => mp.pathElements),
        areTransferLeavesEven,
        proverTransferCount: proverTransferData.length,
      },
    }
  })

const processSignatureSchema = z.object({
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
})

export const processSignatureAction = actionClient
  .inputSchema(processSignatureSchema)
  .action(async ({ parsedInput: { signature } }) => {
    const api = await Barretenberg.new({ threads: 1 })
    const result = await processSignature(signature as `0x${string}`, api)

    return {
      nullifier: result.nullifier,
      fullSignature: result.fullSignature,
    }
  })
