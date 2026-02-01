import { ChainId } from '@repo/types'
import {
  mainnet,
  optimism,
  bsc,
  polygon,
  base,
  arbitrum,
  scroll,
  type Chain,
} from 'viem/chains'

export const CHAIN_CONFIG = {
  [ChainId.ETHEREUM]: {
    name: 'Ethereum',
    viemChain: mainnet,
    blockExplorer: 'https://etherscan.io',
  },
  [ChainId.OPTIMISM]: {
    name: 'Optimism',
    viemChain: optimism,
    blockExplorer: 'https://optimistic.etherscan.io',
  },
  [ChainId.BNB]: {
    name: 'BNB Chain',
    viemChain: bsc,
    blockExplorer: 'https://bscscan.com',
  },
  [ChainId.POLYGON]: {
    name: 'Polygon',
    viemChain: polygon,
    blockExplorer: 'https://polygonscan.com',
  },
  [ChainId.BASE]: {
    name: 'Base',
    viemChain: base,
    blockExplorer: 'https://basescan.org',
  },
  [ChainId.ARBITRUM]: {
    name: 'Arbitrum',
    viemChain: arbitrum,
    blockExplorer: 'https://arbiscan.io',
  },
  [ChainId.SCROLL]: {
    name: 'Scroll',
    viemChain: scroll,
    blockExplorer: 'https://scrollscan.com',
  },
} as const

export function getChainName(chainId: number): string {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG]
  return config?.name ?? `Chain ${chainId}`
}

export function getViemChain(chainId: number): Chain {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG]
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  return config.viemChain
}

export function getBlockExplorerUrl(chainId: number): string {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG]
  return config?.blockExplorer ?? 'https://etherscan.io'
}
