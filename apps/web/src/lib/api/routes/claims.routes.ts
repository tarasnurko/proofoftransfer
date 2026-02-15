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
import { getTransfersForClaim, upsertTransfers } from '@/db/queries/transfers'
import { getClaimById } from '@/db/queries/claims'
import { mapDbToEtherscanTransfer } from '@/utils/transfer.utils'
import { etherscanService } from '@/services/etherscan'
import { ethereumAddressSchema } from '@/validations/address'
import { MAX_CLAIM_TRANSFERS } from '@/validations/claim'
import {
  prepareSigningBase,
  mapDbTransferToHashInput,
} from '@/lib/proof.server'
import type { InsertTransferEntity } from '@/db/index.types'
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
  recipientAddress: z.string(),
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
      const transfers = await getTransfersForClaim(id)
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

      const transfers = await etherscanService.getERC20Transfers({
        chainId: claim.chainId,
        tokenAddress: claim.tokenAddress,
        recipientAddress: claim.recipientAddress,
        fromTimestamp: claim.fromBlockTimestamp || undefined,
        toTimestamp: claim.toBlockTimestamp || undefined,
      })

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

      const proverIndices: number[] = []
      const proverTransferData: Array<{
        from: string
        to: string
        contractAddress: string
        value: string
        timeStamp: string
        hash: string
      }> = []

      claimTransfers.forEach((t, index) => {
        if (isAddressEqual(t.senderAddress as Address, proverAddress as Address)) {
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
      if (proverIndices.length > MAX_TRANSFERS) {
        throw new Error(`Too many transfers. Maximum ${MAX_TRANSFERS} allowed.`)
      }

      const merkleProofs = proverIndices.map((index) => merkleTree.proof(index))
      const circuitTransfers = mapToCircuitTransfers(
        proverTransferData as Parameters<typeof mapToCircuitTransfers>[0],
      )
      const paddedTransfers = padTransfersArray(circuitTransfers, MAX_TRANSFERS)
      const paddedMerkleProofs = padMerkleProofsArray(merkleProofs, MAX_TRANSFERS, MERKLE_TREE_HEIGHT)
      const areTransferLeavesEven = paddedMerkleProofs.map((mp) =>
        mp.pathIndices.map((idx) => idx === 0),
      )

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
      const { chainId, tokenAddress, recipientAddress } = body

      const fromTimestamp = body.fromDate
        ? Math.floor(new Date(body.fromDate).getTime() / 1000)
        : 0
      const toTimestamp = body.toDate
        ? Math.floor(new Date(body.toDate).getTime() / 1000)
        : 0

      await fetchAndStoreToken(tokenAddress, chainId)

      const fetchedTransfers = await etherscanService.getERC20Transfers({
        chainId,
        tokenAddress,
        recipientAddress,
        fromTimestamp: fromTimestamp || undefined,
        toTimestamp: toTimestamp || undefined,
      })

      if (!fetchedTransfers.length) {
        throw new Error('No transfers found matching these constraints')
      }

      if (fetchedTransfers.length > MAX_CLAIM_TRANSFERS) {
        throw new Error(
          `Too many transfers (${fetchedTransfers.length}). Narrow your constraints.`,
        )
      }

      const transfersData: InsertTransferEntity[] = fetchedTransfers.map((t) => ({
        chainId,
        txHash: t.hash,
        logIndex: parseInt(t.transactionIndex, 10),
        blockNumber: parseInt(t.blockNumber, 10),
        blockTimestamp: parseInt(t.timeStamp, 10),
        senderAddress: t.from.toLowerCase(),
        recipientAddress: t.to.toLowerCase(),
        tokenAddress: t.contractAddress.toLowerCase(),
        amount: t.value,
      }))

      const stored = await upsertTransfers(transfersData)
      return c.json({ transfers: stored })
    },
  )
