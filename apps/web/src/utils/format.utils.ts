import Big from 'big.js'
import { format } from 'date-fns'
import { DATE_FORMAT, DATE_TIME_FORMAT } from '@/constants'

export function truncateHex(hex: string, start = 18, end = 14): string {
  if (hex.length <= start + end) return hex
  return `${hex.slice(0, start)}…${hex.slice(-end)}`
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

export function formatTokenAmount(
  amount: string,
  decimals: number,
  symbol?: string
): string {
  const value = formatTokenValue(amount, decimals)
  return symbol ? `${value} ${symbol}` : value
}

export function formatDate(date: Date | string | number): string {
  return format(new Date(date), DATE_FORMAT)
}

export function formatDateTime(date: Date | string | number): string {
  return format(new Date(date), DATE_TIME_FORMAT)
}

export function formatCountConstraint(min: number, max: number): string {
  if (min > 0 && max > 0) return `${min} — ${max}`
  if (min > 0) return `Min: ${min}`
  return `Max: ${max}`
}
