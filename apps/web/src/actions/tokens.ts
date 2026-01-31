'use server'

import { createPublicClient, http, parseAbi } from 'viem'
import {
  mainnet,
  optimism,
  bsc,
  polygon,
  base,
  arbitrum,
  scroll,
} from 'viem/chains'
import { ChainId } from '@repo/types'
import { createToken, getTokenByAddressAndChain } from '@/db/queries/tokens'
import type { NewToken } from '@/db/schema'
import { EtherscanClient } from '@/lib/etherscan'

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

function getViemChain(chainId: number) {
  switch (chainId) {
    case ChainId.ETHEREUM:
      return mainnet
    case ChainId.OPTIMISM:
      return optimism
    case ChainId.BNB:
      return bsc
    case ChainId.POLYGON:
      return polygon
    case ChainId.BASE:
      return base
    case ChainId.ARBITRUM:
      return arbitrum
    case ChainId.SCROLL:
      return scroll
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`)
  }
}

export async function fetchAndStoreTokenDataAction(
  tokenAddress: string,
  chainId: number,
  recipientAddress?: string,
  fromTimestamp?: number,
  toTimestamp?: number
) {
  try {
    // Check if token data already exists
    const existingToken = await getTokenByAddressAndChain(tokenAddress, chainId)
    if (existingToken.success && existingToken.data) {
      return { success: true, data: existingToken.data }
    }

    // Strategy 1: Try to fetch from Etherscan transfers (if recipientAddress provided)
    if (recipientAddress) {
      try {
        const etherscanClient = new EtherscanClient()
        const transfers = await etherscanClient.fetchERC20Transfers({
          chainId,
          tokenAddress,
          recipientAddress,
          fromTimestamp,
          toTimestamp,
        })

        if (transfers.length > 0) {
          const firstTransfer = transfers[0]
          if (firstTransfer && firstTransfer.tokenName && firstTransfer.tokenSymbol && firstTransfer.tokenDecimal) {
            const tokenData: NewToken = {
              address: tokenAddress.toLowerCase(),
              chain_id: chainId,
              name: firstTransfer.tokenName,
              symbol: firstTransfer.tokenSymbol,
              decimals: parseInt(firstTransfer.tokenDecimal),
            }

            const result = await createToken(tokenData)
            if (result.success && result.data) {
              return { success: true, data: result.data }
            }
          }
        }
      } catch (error) {
        console.log('Failed to fetch token data from Etherscan, trying viem:', error)
      }
    }

    // Strategy 2: Fetch directly from contract using viem
    try {
      const chain = getViemChain(chainId)
      const client = createPublicClient({
        chain,
        transport: http(),
      })

      const [name, symbol, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'name',
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'symbol',
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ])

      const tokenData: NewToken = {
        address: tokenAddress.toLowerCase(),
        chain_id: chainId,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
      }

      const result = await createToken(tokenData)
      if (result.success && result.data) {
        return { success: true, data: result.data }
      }

      return { success: false, error: 'Failed to store token data' }
    } catch (error: any) {
      console.error('Error fetching token data from contract:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch token data from contract',
      }
    }
  } catch (error: any) {
    console.error('Error in fetchAndStoreTokenDataAction:', error)
    return { success: false, error: error.message || 'Failed to fetch token data' }
  }
}
