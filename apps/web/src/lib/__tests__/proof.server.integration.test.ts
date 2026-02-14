import { describe, it, expect, beforeAll } from 'vitest'
import { Barretenberg } from '@aztec/bb.js'
import { buildTransfersMerkleTree, mapDbTransferToHashInput } from '../proof.server'
import type { TransferHashInput } from '../proof.server'
import type { TransferEntity } from '@/db/index.types'

const makeTransferHashInput = (overrides: Partial<TransferHashInput> = {}): TransferHashInput => ({
  from: '0x' + '1'.repeat(40),
  to: '0x' + '2'.repeat(40),
  contractAddress: '0x' + '3'.repeat(40),
  value: '1000000000000000000',
  timeStamp: '1700000000',
  ...overrides,
})

describe('proof.server', () => {
  let api: Barretenberg

  beforeAll(async () => {
    api = await Barretenberg.new({ threads: 1 })
  }, 30_000)

  describe('buildTransfersMerkleTree', () => {
    it('builds a merkle tree and returns a deterministic root', async () => {
      const transfers = [
        makeTransferHashInput({ timeStamp: '1000' }),
        makeTransferHashInput({ timeStamp: '2000' }),
      ]

      const result1 = await buildTransfersMerkleTree(api, transfers)
      const result2 = await buildTransfersMerkleTree(api, transfers)

      expect(result1.merkleRoot).toBeDefined()
      expect(result1.merkleRoot).toBe(result2.merkleRoot)
    })

    it('produces different roots for different transfers', async () => {
      const transfers1 = [makeTransferHashInput({ value: '100' })]
      const transfers2 = [makeTransferHashInput({ value: '200' })]

      const result1 = await buildTransfersMerkleTree(api, transfers1)
      const result2 = await buildTransfersMerkleTree(api, transfers2)

      expect(result1.merkleRoot).not.toBe(result2.merkleRoot)
    })

    it('returns transfer hashes', async () => {
      const transfers = [makeTransferHashInput()]
      const result = await buildTransfersMerkleTree(api, transfers)

      expect(result.transferHashes).toHaveLength(1)
      expect(typeof result.transferHashes[0]).toBe('string')
    })
  })

  describe('mapDbTransferToHashInput', () => {
    it('maps TransferEntity to TransferHashInput', () => {
      const entity: TransferEntity = {
        id: 'test-id',
        chainId: 1,
        txHash: '0xhash',
        logIndex: 0,
        blockNumber: 1000000,
        blockTimestamp: 1700000000,
        senderAddress: '0xsender',
        recipientAddress: '0xrecipient',
        tokenAddress: '0xtoken',
        amount: '1000',
        createdAt: new Date(),
      }

      const result = mapDbTransferToHashInput(entity)
      expect(result).toEqual({
        from: '0xsender',
        to: '0xrecipient',
        contractAddress: '0xtoken',
        value: '1000',
        timeStamp: '1700000000',
      })
    })
  })
})
