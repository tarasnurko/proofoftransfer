import Big from 'big.js'
import { format } from 'date-fns'
import { DATE_FORMAT, DATE_TIME_FORMAT } from '@/constants'

export function truncateHex(hex: string, start = 18, end = 14): string {
  if (hex.length <= start + end) return hex
  return `${hex.slice(0, start)}...${hex.slice(-end)}`
}

export function truncateAddress(address: string, chars = 6): string {
  if (!address) return ''
  return truncateHex(address, chars + 2, chars)
}

export function formatTokenValue(amount: string, decimals: number): string {
  const raw = new Big(amount)
  const divisor = new Big(10).pow(decimals)
  const value = raw.div(divisor)
  return value.toFixed()
}

export function formatSmartNumber(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value
  if (num === 0) return '0'

  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (abs >= 1) {
    const fixed = abs.toFixed(2).replace(/\.00$/, '')
    const [intPart, decPart] = fixed.split('.')
    const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return sign + (decPart ? `${withCommas}.${decPart}` : withCommas)
  }

  // For values < 1: show 2 significant digits after leading zeros
  const str = abs.toPrecision(2)
  // toPrecision may produce scientific notation for very small numbers
  if (str.includes('e')) {
    const match = abs.toFixed(20).match(/^0\.(0*?)(\d{2})/)
    if (match) return `${sign}0.${match[1]}${match[2]}`
  }
  return sign + str
}

export function formatTokenAmount(
  amount: string,
  decimals: number,
  symbol?: string
): string {
  const value = formatTokenValue(amount, decimals)
  const formatted = formatSmartNumber(value)
  return symbol ? `${formatted} ${symbol}` : formatted
}

export function formatDate(date: Date | string | number): string {
  return format(new Date(date), DATE_FORMAT)
}

export function formatDateTime(date: Date | string | number): string {
  return format(new Date(date), DATE_TIME_FORMAT)
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function formatNullifier(nullifier: string | bigint): string {
  const value = typeof nullifier === 'string' ? BigInt(nullifier) : nullifier
  return '0x' + value.toString(16).padStart(64, '0')
}

export function formatCountConstraint(min: number, max: number): string {
  if (min > 0 && max > 0) return `${min} — ${max}`
  if (min > 0) return `Min: ${min}`
  return `Max: ${max}`
}
