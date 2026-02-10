import { SUPPORTED_CHAINS } from '@/constants'
import type { Nullable } from '@/types'

const EXPLORER_URLS: Record<number, string> = {
  1: 'https://etherscan.io',
  10: 'https://optimistic.etherscan.io',
  56: 'https://bscscan.com',
  137: 'https://polygonscan.com',
  8453: 'https://basescan.org',
  42161: 'https://arbiscan.io',
  534352: 'https://scrollscan.com',
}

const EXPLORER_NAMES: Record<number, string> = {
  1: 'Etherscan',
  10: 'Optimistic Etherscan',
  56: 'BscScan',
  137: 'Polygonscan',
  8453: 'BaseScan',
  42161: 'Arbiscan',
  534352: 'Scrollscan',
}

export function getChainName(chainId: number): string {
  return SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || `Chain ${chainId}`
}

export function getExplorerName(chainId: number): Nullable<string> {
  return EXPLORER_NAMES[chainId] || null
}

export function getExplorerBaseUrl(chainId: number): Nullable<string> {
  return EXPLORER_URLS[chainId] || null
}

export function getExplorerAddressUrl(chainId: number, address: string): Nullable<string> {
  const base = EXPLORER_URLS[chainId]
  if (!base) return null
  return `${base}/address/${address}`
}
