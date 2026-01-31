import { getAddress, isAddress } from 'viem'

export function isValidAddress(address: string): boolean {
  return isAddress(address)
}

export function checksumAddress(address: string): string {
  try {
    return getAddress(address)
  } catch {
    return address
  }
}

export function dateToUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

export function unixTimestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000)
}
