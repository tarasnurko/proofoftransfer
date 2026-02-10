import Big from 'big.js'

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
