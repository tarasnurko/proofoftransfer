export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function formatTokenAmount(
  amount: string,
  decimals: number,
  symbol?: string
): string {
  const value = BigInt(amount) / BigInt(10 ** decimals)
  return symbol ? `${value} ${symbol}` : value.toString()
}
