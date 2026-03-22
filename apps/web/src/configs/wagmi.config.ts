import { cookieStorage, createStorage } from 'wagmi'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { mainnet, optimism, bsc, polygon, base, arbitrum, scroll } from '@reown/appkit/networks'
import type { Chain } from 'viem'
import type { NonEmptyArray } from '@repo/types'

export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID

if (!projectId) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is not defined. Please set it in .env.local')
}

export const networks: NonEmptyArray<Chain> = [mainnet, optimism, bsc, polygon, base, arbitrum, scroll]

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId,
  networks,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig
