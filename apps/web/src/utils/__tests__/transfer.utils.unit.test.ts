import { describe, it, expect } from 'vitest'
import { mapDbToEtherscanTransfer, mapTransferToDisplayItem } from '../transfer.utils'
import type { Erc20TransferEntity, Erc721TransferEntity } from '@/db/index.types'
import type { EtherscanTransfer } from '@/types'

const makeErc20Entity = (overrides: Partial<Erc20TransferEntity> = {}): Erc20TransferEntity => ({
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

const makeErc721Entity = (overrides: Partial<Erc721TransferEntity> = {}): Erc721TransferEntity => ({
  id: 'test-id',
  chainId: 1,
  txHash: '0xhash123',
  logIndex: 0,
  blockNumber: 1000000,
  blockTimestamp: 1700000000,
  senderAddress: '0xsender',
  recipientAddress: '0xrecipient',
  tokenAddress: '0xtoken',
  tokenId: '42',
  createdAt: new Date(),
  ...overrides,
})

describe('mapDbToEtherscanTransfer', () => {
  it('maps ERC-20 entity correctly', () => {
    const entity = makeErc20Entity()
    const result = mapDbToEtherscanTransfer(entity)

    expect(result).toEqual({
      hash: '0xhash123',
      from: '0xsender',
      to: '0xrecipient',
      contractAddress: '0xtoken',
      value: '1000000000000000000',
      timeStamp: '1700000000',
      blockNumber: '1000000',
      tokenId: undefined,
    })
  })

  it('maps ERC-721 entity with value=1 and tokenId', () => {
    const entity = makeErc721Entity()
    const result = mapDbToEtherscanTransfer(entity)

    expect(result.value).toBe('1')
    expect(result.tokenId).toBe('42')
  })

  it('converts numeric blockTimestamp to string', () => {
    const entity = makeErc20Entity({ blockTimestamp: 1700000100 })
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
      tokenId: undefined,
      txHash: '0xhash',
    })
  })

  it('includes tokenId when present', () => {
    const transfer: EtherscanTransfer = {
      hash: '0xhash',
      from: '0xsender',
      to: '0xrecipient',
      contractAddress: '0xtoken',
      value: '1',
      timeStamp: '1700000000',
      blockNumber: '100',
      tokenId: '42',
    }

    const result = mapTransferToDisplayItem(transfer)
    expect(result.tokenId).toBe('42')
  })
})
