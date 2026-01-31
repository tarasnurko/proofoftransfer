import axios from 'axios'
import type { EtherscanERC20Transfer } from '@repo/types'

const ETHERSCAN_API_V2_BASE = 'https://api.etherscan.io/v2/api'

interface FetchTransfersParams {
  chainId: number
  tokenAddress: string
  recipientAddress: string
  fromTimestamp?: number
  toTimestamp?: number
}

interface EtherscanResponse {
  status: string
  message: string
  result: any
}

export class EtherscanClient {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.ETHERSCAN_API_KEY || 'demo'
  }

  async fetchERC20Transfers(
    params: FetchTransfersParams
  ): Promise<EtherscanERC20Transfer[]> {
    const { chainId, tokenAddress, recipientAddress, fromTimestamp, toTimestamp } = params

    // Validate timestamps are not in the future
    const now = Math.floor(Date.now() / 1000)
    if (fromTimestamp && fromTimestamp > now) {
      throw new Error('From timestamp cannot be in the future')
    }
    if (toTimestamp && toTimestamp > now) {
      throw new Error('To timestamp cannot be in the future')
    }

    // Convert timestamps to block numbers for API query
    const startBlock = fromTimestamp
      ? await this.getBlockByTimestamp(chainId, fromTimestamp, 'after')
      : 0
    const endBlock = toTimestamp
      ? await this.getBlockByTimestamp(chainId, toTimestamp, 'before')
      : 99999999

    const allTransfers: EtherscanERC20Transfer[] = []
    let page = 1
    const maxRetries = 3

    while (true) {
      const offset = 1000 // Max allowed by Etherscan

      let retries = 0
      let data: EtherscanResponse | null = null

      // Retry logic for rate limits
      while (retries < maxRetries) {
        try {
          const response = await axios.get<EtherscanResponse>(ETHERSCAN_API_V2_BASE, {
            params: {
              chainid: chainId,
              module: 'account',
              action: 'tokentx',
              contractaddress: tokenAddress,
              address: recipientAddress,
              startblock: startBlock,
              endblock: endBlock,
              page,
              offset,
              sort: 'asc',
              apikey: this.apiKey,
            },
          })

          data = response.data
          break
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            // Rate limited - wait and retry with exponential backoff
            const waitTime = Math.pow(2, retries) * 1000
            await new Promise((resolve) => setTimeout(resolve, waitTime))
            retries++
            continue
          }

          retries++
          if (retries >= maxRetries) {
            throw new Error(
              `Failed to fetch transfers after ${maxRetries} retries: ${
                axios.isAxiosError(error) ? error.message : String(error)
              }`
            )
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries))
        }
      }

      if (!data) {
        throw new Error('Failed to fetch data from Etherscan')
      }

      // Validate response
      if (data.status !== '1') {
        if (data.message === 'No transactions found') {
          break
        }
        // Check for common API key issues
        if (
          data.message === 'NOTOK' ||
          (typeof data.result === 'string' && data.result.includes('Invalid API Key'))
        ) {
          throw new Error(
            'Invalid or missing Etherscan API key. Please add ETHERSCAN_API_KEY to your .env.local file. Get your key from https://etherscan.io/apis'
          )
        }
        throw new Error(`Etherscan API error: ${data.message}`)
      }

      const transfers = data.result

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

    // CRITICAL: Filter to only include transfers TO the recipient
    // The Etherscan API returns transfers where the address is either sender or receiver
    // We only want transfers where the recipient is the RECEIVER (to field)
    filteredTransfers = filteredTransfers.filter(
      (t) => t.to.toLowerCase() === recipientAddress.toLowerCase()
    )

    // Also verify the token address matches (should already be filtered by API, but double-check)
    filteredTransfers = filteredTransfers.filter(
      (t) => t.contractAddress.toLowerCase() === tokenAddress.toLowerCase()
    )

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

  async getBlockByTimestamp(
    chainId: number,
    timestamp: number,
    closest: 'before' | 'after' = 'before'
  ): Promise<number> {
    const now = Math.floor(Date.now() / 1000)
    if (timestamp > now) {
      throw new Error('Block timestamp cannot be in the future')
    }

    try {
      const response = await axios.get<EtherscanResponse>(ETHERSCAN_API_V2_BASE, {
        params: {
          chainid: chainId,
          module: 'block',
          action: 'getblocknobytime',
          timestamp,
          closest,
          apikey: this.apiKey,
        },
      })

      if (response.data.status === '1' && response.data.result) {
        return Number(response.data.result)
      }

      console.error(`Etherscan API error: ${response.data.message || 'Unknown error'}`)
      return closest === 'after' ? 0 : 99999999
    } catch (error) {
      console.error('Error getting block by timestamp:', error)
      return closest === 'after' ? 0 : 99999999
    }
  }
}

// Default client
export const etherscanClient = new EtherscanClient()
