import { format } from "date-fns"

export function formatAddress(address: string | null): string {
  if (!address) return 'Anonymous'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatTimestamp(timestamp: number): string {
  if (timestamp === 0) return 'No limit'
  return format(new Date(timestamp * 1000), 'MMM d, yyyy')
}
