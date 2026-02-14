import { describe, it, expect } from 'vitest'
import { ethereumAddressSchema, ethereumAddressLowercaseSchema } from '../address'

describe('ethereumAddressSchema', () => {
  it('accepts valid checksum address', () => {
    const result = ethereumAddressSchema.safeParse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    expect(result.success).toBe(true)
  })

  it('accepts valid lowercase address', () => {
    const result = ethereumAddressSchema.safeParse('0x' + 'a'.repeat(40))
    expect(result.success).toBe(true)
  })

  it('rejects non-address string', () => {
    const result = ethereumAddressSchema.safeParse('not-an-address')
    expect(result.success).toBe(false)
  })

  it('rejects too short address', () => {
    const result = ethereumAddressSchema.safeParse('0x1234')
    expect(result.success).toBe(false)
  })
})

describe('ethereumAddressLowercaseSchema', () => {
  it('lowercases valid checksum address', () => {
    const result = ethereumAddressLowercaseSchema.safeParse('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('0xd8da6bf26964af9d7eed9e03e53415d37aa96045')
    }
  })
})
