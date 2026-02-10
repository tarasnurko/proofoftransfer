'use server'

import { revalidatePath } from 'next/cache'
import { Barretenberg } from '@aztec/bb.js'
import { actionClient } from '@/lib/safe-action'
import { createClaimSchema, fetchTransfersSchema, dateToTimestamp, MAX_TRANSFERS } from '@/validations/claim'
import { createClaim, updateClaimMerkleRoot } from '@/db/queries/claims'
import type { InsertClaimEntity, InsertTransferEntity } from '@/db/index.types'
import { fetchAndStoreTokenDataAction } from './tokens.actions'
import {
  hashString,
  hashTransfer,
  MerkleTree,
  poseidon2HashStringsLeftRight,
  MERKLE_TREE_HEIGHT,
  ZERO_VALUES,
} from '@repo/circuit-utils'
import { etherscanClient } from '@/lib/etherscan'
import { bulkUpsertTransfers, getTransfersByConstraints } from '@/db/queries/transfers'
import { fieldToBigint } from '@repo/circuit-utils'
import { db } from '@/db/client'

export const fetchClaimTransfersAction = actionClient
  .inputSchema(fetchTransfersSchema)
  .action(async ({ parsedInput }) => {
    const fromBlockTimestamp = dateToTimestamp(parsedInput.fromDate)
    const toBlockTimestamp = dateToTimestamp(parsedInput.toDate)

    await fetchAndStoreTokenDataAction({
      tokenAddress: parsedInput.tokenAddress,
      chainId: parsedInput.chainId,
    })

    const fetchedTransfers = await etherscanClient.fetchERC20Transfers({
      chainId: parsedInput.chainId,
      tokenAddress: parsedInput.tokenAddress,
      recipientAddress: parsedInput.recipientAddress,
      fromTimestamp: fromBlockTimestamp || undefined,
      toTimestamp: toBlockTimestamp || undefined,
    })

    if (!fetchedTransfers.length) {
      throw new Error('No transfers found matching these constraints')
    }

    if (fetchedTransfers.length > MAX_TRANSFERS) {
      throw new Error(
        `Too many transfers (${fetchedTransfers.length}). Narrow your constraints (shorter date range, amount limits, etc.)`
      )
    }

    const transfersData: InsertTransferEntity[] = fetchedTransfers.map((t) => ({
      chainId: parsedInput.chainId,
      txHash: t.hash,
      logIndex: parseInt(t.transactionIndex, 10),
      blockNumber: parseInt(t.blockNumber, 10),
      blockTimestamp: parseInt(t.timeStamp, 10),
      senderAddress: t.from.toLowerCase(),
      recipientAddress: t.to.toLowerCase(),
      tokenAddress: t.contractAddress.toLowerCase(),
      amount: t.value,
    }))

    const stored = await bulkUpsertTransfers(transfersData)

    return { transfers: stored }
  })

export const createClaimAction = actionClient
  .inputSchema(createClaimSchema)
  .action(async ({ parsedInput }) => {
    const api = await Barretenberg.new({ threads: 1 })
    const messageHashBytes = await hashString(api, parsedInput.claimMessage)
    const messageHash = '0x' + fieldToBigint(messageHashBytes).toString(16)

    const fromBlockTimestamp = dateToTimestamp(parsedInput.fromDate)
    const toBlockTimestamp = dateToTimestamp(parsedInput.toDate)

    const claimData: InsertClaimEntity = {
      message: parsedInput.claimMessage,
      messageHash,
      tokenAddress: parsedInput.tokenAddress,
      recipientAddress: parsedInput.recipientAddress,
      minTransfersSum: parsedInput.minTransfersSum,
      maxTransfersSum: parsedInput.maxTransfersSum,
      fromBlockTimestamp,
      toBlockTimestamp,
      chainId: parsedInput.chainId,
    }

    await fetchAndStoreTokenDataAction({
      tokenAddress: parsedInput.tokenAddress,
      chainId: parsedInput.chainId,
    })

    const storedTransfers = await getTransfersByConstraints({
      chainId: parsedInput.chainId,
      tokenAddress: parsedInput.tokenAddress,
      recipientAddress: parsedInput.recipientAddress,
      fromTimestamp: fromBlockTimestamp || undefined,
      toTimestamp: toBlockTimestamp || undefined,
    })

    if (!storedTransfers.length) {
      throw new Error('No transfers found — fetch transfers first')
    }

    const result = await db.transaction(async (tx) => {
      const claim = await createClaim(claimData, tx)

      const transferHashesBytes = await Promise.all(
        storedTransfers.map((t) =>
          hashTransfer(api, {
            from: t.senderAddress,
            to: t.recipientAddress,
            contractAddress: t.tokenAddress,
            value: t.amount,
            timeStamp: t.blockTimestamp.toString(),
          })
        )
      )

      const transferHashes = transferHashesBytes.map((hash) =>
        fieldToBigint(hash).toString()
      )

      const merkleTree = new MerkleTree(
        MERKLE_TREE_HEIGHT,
        ZERO_VALUES,
        (left, right) => poseidon2HashStringsLeftRight(api, left, right)
      )

      await merkleTree.init(transferHashes)
      const merkleRoot = merkleTree.root()

      await updateClaimMerkleRoot(claim.id, merkleRoot, tx)

      return claim
    })

    revalidatePath('/')

    return { claimId: result.id }
  })
