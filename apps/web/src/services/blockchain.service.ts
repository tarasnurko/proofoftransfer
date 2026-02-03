import { createPublicClient, http, type PublicClient } from 'viem'
import { getViemChain } from '@/utils/blockchain.utils'
import { erc20Abi } from '@/abi/erc20Abi'

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

  static async readTokenMetadata(
    tokenAddress: `0x${string}`,
    chainId: number
  ): Promise<{ name: string; symbol: string; decimals: number }> {
    const client = this.getClient(chainId)

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
  }
}
