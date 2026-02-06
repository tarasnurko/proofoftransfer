import { createPublicClient, http, type Address, type PublicClient, ContractFunctionExecutionError } from 'viem'
import { getViemChain } from '@/utils/blockchain.utils'
import { erc20Abi } from '@/abi/erc20Abi'
import type { TokenMetadata } from '@/types'

const viemClients = new Map<number, PublicClient>()

export class BlockchainService {
  static getClient(chainId: number): PublicClient {
    const cached = viemClients.get(chainId)
    if (cached) {
      return cached
    }

    const chain = getViemChain(chainId)
    const client = createPublicClient({
      chain,
      transport: http(),
    })

    viemClients.set(chainId, client)
    return client
  }

  static async getTokenMetadata(
    tokenAddress: Address,
    chainId: number
  ): Promise<TokenMetadata> {
    const client = this.getClient(chainId)

    try {
      const [name, symbol, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'name',
        }),
        client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        client.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
      ])

      return {
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
      }
    } catch (error) {
      if (error instanceof ContractFunctionExecutionError) {
        const msg = error.message
        if (msg.includes('returned no data') || msg.includes('is not a contract')) {
          throw new Error(`No contract found at ${tokenAddress} on chain ${chainId}`)
        }
        throw new Error(`Address ${tokenAddress} is not a valid ERC-20 token on chain ${chainId}`)
      }
      if (error instanceof Error && (error.name === 'HttpRequestError' || error.name === 'TimeoutError')) {
        throw new Error('RPC request failed — try again later')
      }
      throw new Error(`Failed to fetch token metadata: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}
