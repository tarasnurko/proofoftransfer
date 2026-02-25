import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { isAddressEqual, type Address } from 'viem'
import {
  MAX_TRANSFERS,
  MERKLE_TREE_HEIGHT,
  mapToCircuitTransfers,
  padTransfersArray,
  padMerkleProofsArray,
} from '@repo/circuit-utils'
import { getProofsByClaimId, checkNullifierExists } from '@/db/queries/proofs'
import { getErc20Transfers, getErc721Transfers, getErc1155Transfers, upsertErc20Transfers, upsertErc721Transfers, upsertErc1155Transfers } from '@/db/queries/transfers'
import { getClaimById } from '@/db/queries/claims'
import { mapDbToEtherscanTransfer } from '@/utils/transfer.utils'
import { etherscanService } from '@/services/etherscan'
import { ethereumAddressSchema } from '@/validations/address'
import { MAX_CLAIM_TRANSFERS } from '@/validations/claim'
import {
  prepareSigningBase,
  mapDbTransferToHashInput,
} from '@/lib/proof.server'
import type { InsertErc20TransferEntity, InsertErc721TransferEntity, InsertErc1155TransferEntity } from '@/db/index.types'
import { RATE_LIMITS } from '@/services/rate-limit'
import { fetchAndStoreToken } from './tokens.routes'
import { createRateLimitMiddleware } from '../middleware/rate-limit.middleware'

// --- Param / query schemas ---

const claimIdParam = z.object({
  id: z.string().uuid(),
})

const proofsQuery = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('9'),
  search: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

const nullifierQuery = z.object({
  nullifier: z.string().min(1),
})

const proverSigningBody = z.object({
  proverAddress: ethereumAddressSchema,
})

const loadTransfersBody = z.object({
  chainId: z.number(),
  tokenAddress: z.string(),
  counterpartyAddress: z.string(),
  isProverSender: z.boolean().default(true),
  tokenType: z.enum(['erc20', 'erc721', 'erc1155']).default('erc20'),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
})

// --- Routes ---

export const claimsRoutes = new Hono()
  .get(
    '/:id/proofs',
    createRateLimitMiddleware('getProofs', RATE_LIMITS.GET_PROOFS),
    zValidator('param', claimIdParam),
    zValidator('query', proofsQuery),
    async (c) => {
      const { id } = c.req.valid('param')
      const { page: pageStr, limit: limitStr, search, sortOrder } = c.req.valid('query')
      const page = Math.max(Number(pageStr), 1)
      const limit = Math.max(Number(limitStr), 1)
      const offset = (page - 1) * limit

      const result = await getProofsByClaimId(id, { limit, offset, search, sortOrder })
      return c.json(result)
    },
  )
  .get(
    '/:id/transfers',
    createRateLimitMiddleware('getTransfers', RATE_LIMITS.GET_TRANSFERS),
    zValidator('param', claimIdParam),
    async (c) => {
      const { id } = c.req.valid('param')
      const claim = await getClaimById(id)
      if (!claim) return c.json({ error: 'Claim not found' }, 404)

      const queryParams = {
        chainId: claim.chainId,
        tokenAddress: claim.tokenAddress,
        ...(claim.isProverSender
          ? { recipientAddress: claim.counterpartyAddress }
          : { senderAddress: claim.counterpartyAddress }),
        fromTimestamp: claim.fromBlockTimestamp || undefined,
        toTimestamp: claim.toBlockTimestamp || undefined,
      }

      let transfers
      if (claim.tokenType === 'erc721') {
        transfers = await getErc721Transfers(queryParams)
      } else if (claim.tokenType === 'erc1155') {
        transfers = await getErc1155Transfers(queryParams)
      } else {
        transfers = await getErc20Transfers(queryParams)
      }

      return c.json(transfers.map(mapDbToEtherscanTransfer))
    },
  )
  .get(
    '/:id/nullifier-exists',
    createRateLimitMiddleware('getNullifierExists', RATE_LIMITS.GET_NULLIFIER_EXISTS),
    zValidator('param', claimIdParam),
    zValidator('query', nullifierQuery),
    async (c) => {
      const { id } = c.req.valid('param')
      const { nullifier } = c.req.valid('query')
      const exists = await checkNullifierExists({ claimId: id, nullifier })
      return c.json({ exists })
    },
  )
  .get(
    '/:id/etherscan-transfers',
    createRateLimitMiddleware('getEtherscanTransfers', RATE_LIMITS.GET_ETHERSCAN_TRANSFERS),
    zValidator('param', claimIdParam),
    async (c) => {
      const { id } = c.req.valid('param')
      const claim = await getClaimById(id)
      if (!claim) return c.json({ error: 'Claim not found' }, 404)

      const fetchParams = {
        chainId: claim.chainId,
        tokenAddress: claim.tokenAddress,
        address: claim.counterpartyAddress,
        fromTimestamp: claim.fromBlockTimestamp || undefined,
        toTimestamp: claim.toBlockTimestamp || undefined,
      }

      let transfers
      if (claim.tokenType === 'erc721') {
        transfers = await etherscanService.getERC721Transfers(fetchParams)
      } else if (claim.tokenType === 'erc1155') {
        transfers = await etherscanService.getERC1155Transfers(fetchParams)
      } else {
        transfers = await etherscanService.getERC20Transfers(fetchParams)
      }

      return c.json({ transfers })
    },
  )
  .post(
    '/:id/prover-signing-data',
    createRateLimitMiddleware('proverSigningData', RATE_LIMITS.PROVER_SIGNING_DATA),
    zValidator('param', claimIdParam),
    zValidator('json', proverSigningBody),
    async (c) => {
      const { id } = c.req.valid('param')
      const { proverAddress } = c.req.valid('json')

      const { claim, claimTransfers, merkleTree, merkleRoot, eip712, chainId } =
        await prepareSigningBase(id)

      const isProverSender = claim.isProverSender

      const proverIndices: number[] = []
      const proverTransferData: Array<{
        from: string
        to: string
        contractAddress: string
        value: string
        timeStamp: string
        hash: string
      }> = []

      claimTransfers.forEach((transfer, index) => {
        const matchField = isProverSender ? transfer.senderAddress : transfer.recipientAddress
        if (isAddressEqual(matchField as Address, proverAddress as Address)) {
          proverIndices.push(index)
          const amount = 'amount' in transfer ? transfer.amount : '1'
          proverTransferData.push({
            from: transfer.senderAddress,
            to: transfer.recipientAddress,
            contractAddress: transfer.tokenAddress,
            value: amount,
            timeStamp: transfer.blockTimestamp.toString(),
            hash: transfer.txHash,
          })
        }
      })

      if (!proverIndices.length) throw new Error('No transfers found for prover address')
      if (proverIndices.length > MAX_TRANSFERS) {
        throw new Error(`Too many transfers. Maximum ${MAX_TRANSFERS} allowed.`)
      }

      const merkleProofs = proverIndices.map((index) => merkleTree.proof(index))
      const circuitTransfers = mapToCircuitTransfers(
        proverTransferData as Parameters<typeof mapToCircuitTransfers>[0],
      )
      const paddedTransfers = padTransfersArray(circuitTransfers, MAX_TRANSFERS)
      const paddedMerkleProofs = padMerkleProofsArray(merkleProofs, MAX_TRANSFERS, MERKLE_TREE_HEIGHT)
      const areTransferLeavesEven = paddedMerkleProofs.map((merkleProof) =>
        merkleProof.pathIndices.map((idx) => idx === 0),
      )

      const totalSum = proverTransferData.reduce((sum, transfer) => sum + BigInt(transfer.value), 0n)
      const minSum = BigInt(claim.minTransfersSum || '0')
      const maxSum = BigInt(claim.maxTransfersSum || '0')
      const fromTs = BigInt(claim.fromBlockTimestamp || 0)
      const toTs = BigInt(claim.toBlockTimestamp || 0)
      const minCount = claim.minTransfersCount || 0
      const maxCount = claim.maxTransfersCount || 0

      for (const transfer of proverTransferData) {
        const timestamp = BigInt(transfer.timeStamp)
        if (fromTs && timestamp < fromTs) throw new Error('Transfer timestamp before fromBlockTimestamp')
        if (toTs && timestamp > toTs) throw new Error('Transfer timestamp after toBlockTimestamp')
      }
      if (minSum && totalSum < minSum) throw new Error(`Sum ${totalSum} below minimum ${minSum}`)
      if (maxSum && totalSum > maxSum) throw new Error(`Sum ${totalSum} above maximum ${maxSum}`)
      if (minCount && proverTransferData.length < minCount) throw new Error(`Count ${proverTransferData.length} below minimum ${minCount}`)
      if (maxCount && proverTransferData.length > maxCount) throw new Error(`Count ${proverTransferData.length} above maximum ${maxCount}`)

      return c.json({
        eip712,
        chainId,
        circuitData: {
          merkleRoot,
          paddedTransfers,
          paddedMerkleProofElements: paddedMerkleProofs.map((mp) => mp.pathElements),
          areTransferLeavesEven,
          proverTransferCount: proverTransferData.length,
        },
      })
    },
  )
  .get(
    '/:id/verifier-signing-data',
    createRateLimitMiddleware('verifierSigningData', RATE_LIMITS.VERIFIER_SIGNING_DATA),
    zValidator('param', claimIdParam),
    async (c) => {
      const { id } = c.req.valid('param')
      const { eip712, chainId } = await prepareSigningBase(id)
      return c.json({ eip712, chainId })
    },
  )
  .post(
    '/load-transfers',
    createRateLimitMiddleware('loadTransfers', RATE_LIMITS.LOAD_TRANSFERS),
    zValidator('json', loadTransfersBody),
    async (c) => {
      const body = c.req.valid('json')
      const { chainId, tokenAddress, counterpartyAddress, tokenType } = body

      const fromTimestamp = body.fromDate
        ? Math.floor(new Date(body.fromDate).getTime() / 1000)
        : 0
      const toTimestamp = body.toDate
        ? Math.floor(new Date(body.toDate).getTime() / 1000)
        : 0

      await fetchAndStoreToken(tokenAddress, chainId)

      const fetchParams = {
        chainId,
        tokenAddress,
        address: counterpartyAddress,
        fromTimestamp: fromTimestamp || undefined,
        toTimestamp: toTimestamp || undefined,
      }

      const mapBaseFields = (transfer: { hash: string; transactionIndex: string; blockNumber: string; timeStamp: string; from: string; to: string; contractAddress: string }) => ({
        chainId,
        txHash: transfer.hash,
        logIndex: parseInt(transfer.transactionIndex, 10),
        blockNumber: parseInt(transfer.blockNumber, 10),
        blockTimestamp: parseInt(transfer.timeStamp, 10),
        senderAddress: transfer.from.toLowerCase(),
        recipientAddress: transfer.to.toLowerCase(),
        tokenAddress: transfer.contractAddress.toLowerCase(),
      })

      if (tokenType === 'erc721') {
        const erc721Transfers = await etherscanService.getERC721Transfers(fetchParams)

        if (!erc721Transfers.length) throw new Error('No transfers found matching these constraints')
        if (erc721Transfers.length > MAX_CLAIM_TRANSFERS) throw new Error(`Too many transfers (${erc721Transfers.length}). Narrow your constraints.`)

        const data: InsertErc721TransferEntity[] = erc721Transfers.map((transfer) => ({
          ...mapBaseFields(transfer),
          tokenId: transfer.tokenID || '0',
        }))
        const stored = await upsertErc721Transfers(data)
        return c.json({ transfers: stored })
      }

      if (tokenType === 'erc1155') {
        const erc1155Transfers = await etherscanService.getERC1155Transfers(fetchParams)

        if (!erc1155Transfers.length) throw new Error('No transfers found matching these constraints')
        if (erc1155Transfers.length > MAX_CLAIM_TRANSFERS) throw new Error(`Too many transfers (${erc1155Transfers.length}). Narrow your constraints.`)

        const data: InsertErc1155TransferEntity[] = erc1155Transfers.map((transfer) => ({
          ...mapBaseFields(transfer),
          tokenId: transfer.tokenID || '0',
          amount: transfer.tokenValue || '1',
        }))
        const stored = await upsertErc1155Transfers(data)
        return c.json({ transfers: stored })
      }

      const erc20Transfers = await etherscanService.getERC20Transfers(fetchParams)

      if (!erc20Transfers.length) throw new Error('No transfers found matching these constraints')
      if (erc20Transfers.length > MAX_CLAIM_TRANSFERS) throw new Error(`Too many transfers (${erc20Transfers.length}). Narrow your constraints.`)

      const data: InsertErc20TransferEntity[] = erc20Transfers.map((transfer) => ({
        ...mapBaseFields(transfer),
        amount: transfer.value,
      }))
      const stored = await upsertErc20Transfers(data)
      return c.json({ transfers: stored })
    },
  )
