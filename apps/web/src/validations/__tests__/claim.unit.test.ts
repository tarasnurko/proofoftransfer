import { describe, it, expect } from 'vitest'
import { createClaimSchema } from '../claim'
import { dateToTimestamp } from '@/utils/date.utils'
import { ChainId } from '@repo/types'

describe('createClaimSchema', () => {
  const validInput = {
    claimMessage: 'This is a valid test claim message',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    recipientAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    minTransfersSum: '100',
    maxTransfersSum: '1000',
    chainId: ChainId.ETHEREUM,
  }

  it('accepts valid input', () => {
    const result = createClaimSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('lowercases addresses', () => {
    const result = createClaimSchema.safeParse({
      ...validInput,
      tokenAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tokenAddress).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
    }
  })

  it('rejects short message', () => {
    const result = createClaimSchema.safeParse({ ...validInput, claimMessage: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid address', () => {
    const result = createClaimSchema.safeParse({ ...validInput, tokenAddress: 'not-an-address' })
    expect(result.success).toBe(false)
  })

  it('rejects when max < min (both positive)', () => {
    const result = createClaimSchema.safeParse({
      ...validInput,
      minTransfersSum: '1000',
      maxTransfersSum: '100',
    })
    expect(result.success).toBe(false)
  })

  it('allows max=0 (uncapped)', () => {
    const result = createClaimSchema.safeParse({
      ...validInput,
      minTransfersSum: '100',
      maxTransfersSum: '0',
    })
    expect(result.success).toBe(true)
  })

  it('rejects end date before start date', () => {
    const result = createClaimSchema.safeParse({
      ...validInput,
      fromDate: new Date('2024-06-01'),
      toDate: new Date('2024-01-01'),
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid date range', () => {
    const result = createClaimSchema.safeParse({
      ...validInput,
      fromDate: new Date('2024-01-01'),
      toDate: new Date('2024-06-01'),
    })
    expect(result.success).toBe(true)
  })
})

describe('dateToTimestamp', () => {
  it('converts Date to unix timestamp', () => {
    const date = new Date('2024-01-01T00:00:00Z')
    expect(dateToTimestamp(date)).toBe(Math.floor(date.getTime() / 1000))
  })

  it('returns 0 for undefined', () => {
    expect(dateToTimestamp(undefined)).toBe(0)
  })

  it('returns 0 for non-Date', () => {
    expect(dateToTimestamp('not-a-date' as unknown as Date)).toBe(0)
  })
})
