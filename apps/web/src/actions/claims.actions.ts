'use server'

import { revalidatePath } from 'next/cache'
import { Barretenberg } from '@aztec/bb.js'
import { actionClient } from '@/lib/safe-action'
import { createClaimSchema, dateToTimestamp } from '@/lib/validations/claim'
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
import { bulkUpsertTransfers, linkTransfersToClaim } from '@/db/queries/transfers'
import { fieldToBigint } from '@repo/circuit-utils'
import { db } from '@/db/client'

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
      creatorAddress: '',
    }

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

    const result = await db.transaction(async (tx) => {
      const claim = await createClaim(claimData)
      const storedTransfers = await bulkUpsertTransfers(transfersData)

      if (storedTransfers.length) {
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

        await linkTransfersToClaim({
          claimId: claim.id,
          transferIds: storedTransfers.map((t) => t.id),
          merkleIndices: storedTransfers.map((_, idx) => idx),
        })

        await updateClaimMerkleRoot(claim.id, merkleRoot)
      }

      return claim
    })

    revalidatePath('/')

    return { claimId: result.id }
  })
