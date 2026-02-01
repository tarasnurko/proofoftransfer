'use server'

import { createPublicClient, http, parseAbi } from 'viem'
import { createToken, getTokenByAddressAndChain } from '@/db/queries/tokens'
import type { InsertTokenEntity } from '@/db/index.types'
import { EtherscanClient } from '@/lib/etherscan'
import { getViemChain } from '@/utils/blockchain.utils'
import { EntityNotFoundException } from '@/db/exceptions'

const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

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
    if (existingToken) {
      return { success: true, data: existingToken }
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
            const tokenData: InsertTokenEntity = {
              address: tokenAddress.toLowerCase(),
              chain_id: chainId,
              name: firstTransfer.tokenName,
              symbol: firstTransfer.tokenSymbol,
              decimals: parseInt(firstTransfer.tokenDecimal),
            }

            const result = await createToken(tokenData)
            return { success: true, data: result }
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

      const tokenData: InsertTokenEntity = {
        address: tokenAddress.toLowerCase(),
        chain_id: chainId,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
      }

      const result = await createToken(tokenData)
      return { success: true, data: result }
    } catch (error: unknown) {
      console.error('Error fetching token data from contract:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch token data from contract',
      }
    }
  } catch (err: unknown) {
    if (err instanceof EntityNotFoundException) {
      return { success: false, error: err.message }
    }

    const message = err instanceof Error ? err.message : 'Failed to fetch token data'
    return { success: false, error: message }
  }
}
