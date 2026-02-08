import type { ClaimEntity as BaseClaimEntity, TokenEntity as BaseTokenEntity, TransferEntity } from '@/db/index.types'
import type { Nullable } from '@/types/common.types'

export interface Chain {
  id: number
  name: string
}

export const SUPPORTED_CHAINS: Chain[] = [
  { id: 1, name: 'Ethereum' },
  { id: 10, name: 'Optimism' },
  { id: 56, name: 'BNB Chain' },
  { id: 137, name: 'Polygon' },
  { id: 8453, name: 'Base' },
  { id: 42161, name: 'Arbitrum' },
  { id: 534352, name: 'Scroll' },
]

export function getChainName(chainId: number): string {
  return SUPPORTED_CHAINS.find(c => c.id === chainId)?.name || `Chain ${chainId}`
}

export const CHAIN_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-[#627eea]/15', text: 'text-[#627eea]', border: 'border-[#627eea]/40' },
  10: { bg: 'bg-[#ff0420]/15', text: 'text-[#ff0420]', border: 'border-[#ff0420]/40' },
  56: { bg: 'bg-[#f0b90b]/15', text: 'text-[#c99d09]', border: 'border-[#f0b90b]/40' },
  137: { bg: 'bg-[#8247e5]/15', text: 'text-[#8247e5]', border: 'border-[#8247e5]/40' },
  8453: { bg: 'bg-[#0052ff]/15', text: 'text-[#0052ff]', border: 'border-[#0052ff]/40' },
  42161: { bg: 'bg-[#28a0f0]/15', text: 'text-[#28a0f0]', border: 'border-[#28a0f0]/40' },
  534352: { bg: 'bg-[#ffeeda]/30', text: 'text-[#e5a566]', border: 'border-[#e5a566]/40' },
}

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

// Extended types with computed fields
export interface ClaimEntity extends BaseClaimEntity {
  proofCount: number
  token: Nullable<BaseTokenEntity>
}

export interface TokenEntity extends BaseTokenEntity {}

export interface VerificationStats {
  successful: number
  failed: number
}

export interface ProofEntity {
  id: string
  claimId: string
  nullifier: string
  proofData: string
  publicInputs: object
  createdAt: Date
  verified?: boolean
  verificationResult?: {
    valid: boolean
    message?: string
  }
  verificationStats?: VerificationStats
}

export interface EtherscanTransfer {
  hash: string
  from: string
  to: string
  contractAddress: string
  value: string
  timeStamp: string
  blockNumber: string
}

export function mapDbToEtherscanTransfer(t: TransferEntity): EtherscanTransfer {
  return {
    hash: t.txHash,
    from: t.senderAddress,
    to: t.recipientAddress,
    contractAddress: t.tokenAddress,
    value: t.amount,
    timeStamp: t.blockTimestamp.toString(),
    blockNumber: t.blockNumber.toString(),
  }
}
