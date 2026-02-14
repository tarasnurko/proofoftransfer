import { describe, it, expect } from 'vitest'
import { mapDbToEtherscanTransfer, mapTransferToDisplayItem } from '../transfer.utils'
import type { TransferEntity } from '@/db/index.types'
import type { EtherscanTransfer } from '@/types'

const makeTransferEntity = (overrides: Partial<TransferEntity> = {}): TransferEntity => ({
  id: 'test-id',
  chainId: 1,
  txHash: '0xhash123',
  logIndex: 0,
  blockNumber: 1000000,
  blockTimestamp: 1700000000,
  senderAddress: '0xsender',
  recipientAddress: '0xrecipient',
  tokenAddress: '0xtoken',
  amount: '1000000000000000000',
  createdAt: new Date(),
  ...overrides,
})

describe('mapDbToEtherscanTransfer', () => {
  it('maps all fields correctly', () => {
    const entity = makeTransferEntity()
    const result = mapDbToEtherscanTransfer(entity)

    expect(result).toEqual({
      hash: '0xhash123',
      from: '0xsender',
      to: '0xrecipient',
      contractAddress: '0xtoken',
      value: '1000000000000000000',
      timeStamp: '1700000000',
      blockNumber: '1000000',
    })
  })

  it('converts numeric blockTimestamp to string', () => {
    const entity = makeTransferEntity({ blockTimestamp: 1700000100 })
    const result = mapDbToEtherscanTransfer(entity)
    expect(result.timeStamp).toBe('1700000100')
  })
})

describe('mapTransferToDisplayItem', () => {
  it('maps to display format', () => {
    const transfer: EtherscanTransfer = {
      hash: '0xhash',
      from: '0xsender',
      to: '0xrecipient',
      contractAddress: '0xtoken',
      value: '1000',
      timeStamp: '1700000000',
      blockNumber: '100',
    }

    const result = mapTransferToDisplayItem(transfer)
    expect(result).toEqual({
      from: '0xsender',
      amount: '1000',
      timestamp: 1700000000,
    })
  })
})
