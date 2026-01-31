import { z } from 'zod'
import type { EtherscanERC20Transfer } from '@repo/types'
import { getEnv } from './env'

const ETHERSCAN_ENDPOINTS: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  10: 'https://api-optimistic.etherscan.io/api',
  56: 'https://api.bscscan.com/api',
  137: 'https://api.polygonscan.com/api',
  8453: 'https://api.basescan.org/api',
  42161: 'https://api.arbiscan.io/api',
  534352: 'https://api.scrollscan.com/api',
}

// Average block time in seconds for different chains
const BLOCK_TIME: Record<number, number> = {
  1: 12, // Ethereum
  10: 2, // Optimism
  56: 3, // BNB
  137: 2, // Polygon
  8453: 2, // Base
  42161: 0.25, // Arbitrum
  534352: 3, // Scroll
}

interface FetchTransfersParams {
  tokenAddress: string
  recipientAddress: string
  fromTimestamp?: number
  toTimestamp?: number
}

export class EtherscanClient {
  private apiKey: string
  private endpoint: string
  private chainId: number
  private blockTime: number

  constructor(chainId: number = 8453) {
    this.chainId = chainId
    this.apiKey = process.env.BASESCAN_API_KEY || 'demo'  // Use demo for development
    this.endpoint = ETHERSCAN_ENDPOINTS[chainId]!
    this.blockTime = BLOCK_TIME[chainId] || 2

    if (!this.endpoint) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }
  }

  async fetchERC20Transfers(
    params: FetchTransfersParams
  ): Promise<EtherscanERC20Transfer[]> {
    const { tokenAddress, recipientAddress, fromTimestamp, toTimestamp } = params

    // Estimate block numbers from timestamps if provided
    const startBlock = fromTimestamp
      ? await this.estimateBlockFromTimestamp(fromTimestamp)
      : 0
    const endBlock = toTimestamp
      ? await this.estimateBlockFromTimestamp(toTimestamp)
      : 99999999

    const allTransfers: EtherscanERC20Transfer[] = []
    let page = 1
    const maxRetries = 3

    while (true) {
      const offset = 1000 // Max allowed by Etherscan
      const url = new URL(this.endpoint)
      url.searchParams.set('module', 'account')
      url.searchParams.set('action', 'tokentx')
      url.searchParams.set('contractaddress', tokenAddress)
      url.searchParams.set('address', recipientAddress)
      url.searchParams.set('startblock', startBlock.toString())
      url.searchParams.set('endblock', endBlock.toString())
      url.searchParams.set('page', page.toString())
      url.searchParams.set('offset', offset.toString())
      url.searchParams.set('sort', 'asc')
      url.searchParams.set('apikey', this.apiKey)

      let retries = 0
      let response: Response | null = null

      // Retry logic for rate limits
      while (retries < maxRetries) {
        try {
          response = await fetch(url.toString())

          if (response.status === 429) {
            // Rate limited - wait and retry
            const waitTime = Math.pow(2, retries) * 1000 // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, waitTime))
            retries++
            continue
          }

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          break
        } catch (error) {
          retries++
          if (retries >= maxRetries) {
            throw new Error(`Failed to fetch transfers after ${maxRetries} retries: ${error}`)
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
        }
      }

      if (!response) {
        throw new Error('Failed to fetch data from Etherscan')
      }

      const data = await response.json()

      // Validate response
      if (data.status !== '1') {
        if (data.message === 'No transactions found') {
          break
        }
        throw new Error(`Etherscan API error: ${data.message}`)
      }

      const transfers = data.result as EtherscanERC20Transfer[]

      if (!Array.isArray(transfers) || transfers.length === 0) {
        break
      }

      allTransfers.push(...transfers)

      // If we got less than the offset, we've reached the end
      if (transfers.length < offset) {
        break
      }

      page++
    }

    // Additional client-side filtering by timestamp for precision
    let filteredTransfers = allTransfers

    if (fromTimestamp) {
      filteredTransfers = filteredTransfers.filter(
        (t) => Number(t.timeStamp) >= fromTimestamp
      )
    }

    if (toTimestamp) {
      filteredTransfers = filteredTransfers.filter(
        (t) => Number(t.timeStamp) <= toTimestamp
      )
    }

    return filteredTransfers
  }

  async estimateBlockFromTimestamp(timestamp: number): Promise<number> {
    const url = new URL(this.endpoint)
    url.searchParams.set('module', 'block')
    url.searchParams.set('action', 'getblocknobytime')
    url.searchParams.set('timestamp', timestamp.toString())
    url.searchParams.set('closest', 'before')
    url.searchParams.set('apikey', this.apiKey)

    try {
      const response = await fetch(url.toString())
      const data = await response.json()

      if (data.status === '1' && data.result) {
        return Number(data.result)
      }

      // Fallback: estimate based on current time and average block time
      const now = Math.floor(Date.now() / 1000)
      const timeDiff = now - timestamp
      const blocksDiff = Math.floor(timeDiff / this.blockTime)

      // Assume a reasonable current block number (this is a rough estimate)
      const estimatedCurrentBlock = 10000000 // Adjust based on chain
      return Math.max(0, estimatedCurrentBlock - blocksDiff)
    } catch (error) {
      console.error('Error estimating block number:', error)
      return 0
    }
  }
}

// Default client for Base chain
export const baseScanClient = new EtherscanClient(8453)
