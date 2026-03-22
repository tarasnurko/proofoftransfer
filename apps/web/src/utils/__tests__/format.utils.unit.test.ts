import { describe, it, expect } from 'vitest'
import { truncateAddress, formatTokenValue, formatTokenAmount, formatDate } from '../format.utils'

describe('truncateAddress', () => {
  it('truncates address with default chars', () => {
    expect(truncateAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x123456...345678')
  })

  it('truncates with custom chars', () => {
    expect(truncateAddress('0x1234567890abcdef1234567890abcdef12345678', 6)).toBe('0x123456...345678')
  })

  it('returns empty string for empty input', () => {
    expect(truncateAddress('')).toBe('')
  })
})

describe('formatTokenValue', () => {
  it('formats 18-decimal token value', () => {
    expect(formatTokenValue('1000000000000000000', 18)).toBe('1')
  })

  it('formats fractional value', () => {
    expect(formatTokenValue('500000000000000000', 18)).toBe('0.5')
  })

  it('formats 6-decimal token value', () => {
    expect(formatTokenValue('1000000', 6)).toBe('1')
  })

  it('handles zero', () => {
    expect(formatTokenValue('0', 18)).toBe('0')
  })

  it('handles large values', () => {
    expect(formatTokenValue('1000000000000000000000', 18)).toBe('1000')
  })
})

describe('formatTokenAmount', () => {
  it('formats with symbol', () => {
    expect(formatTokenAmount('1000000000000000000', 18, 'ETH')).toBe('1 ETH')
  })

  it('formats without symbol', () => {
    expect(formatTokenAmount('1000000000000000000', 18)).toBe('1')
  })
})

describe('formatDate', () => {
  it('formats Date object', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const result = formatDate(date)
    expect(result).toMatch(/15\.01\.2024/)
  })

  it('formats timestamp number', () => {
    const result = formatDate(1705315200000) // 2024-01-15
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/)
  })
})
