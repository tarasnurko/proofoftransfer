import Big from 'big.js'
import { format } from 'date-fns'
import { DATE_FORMAT, DATE_TIME_FORMAT } from '@/constants'

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
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
