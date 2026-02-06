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

const VIEM_CHAINS: Record<number, Chain> = {
  [ChainId.ETHEREUM]: mainnet,
  [ChainId.OPTIMISM]: optimism,
  [ChainId.BNB]: bsc,
  [ChainId.POLYGON]: polygon,
  [ChainId.BASE]: base,
  [ChainId.ARBITRUM]: arbitrum,
  [ChainId.SCROLL]: scroll,
}

export function getViemChain(chainId: number): Chain {
  const chain = VIEM_CHAINS[chainId]
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }
  return chain
}
