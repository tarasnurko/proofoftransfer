import { http, HttpResponse } from 'msw'
import type { EtherscanERC20Transfer } from '@repo/types'

const API_V2_BASE = 'https://api.etherscan.io/v2/api'

interface EtherscanHandlerConfig {
  transfers?: EtherscanERC20Transfer[]
  blockByTimestamp?: Record<string, string>
}

export function createEtherscanHandlers(config: EtherscanHandlerConfig = {}) {
  const { transfers = [], blockByTimestamp = {} } = config

  return [
    http.get(API_V2_BASE, ({ request }) => {
      const url = new URL(request.url)
      const action = url.searchParams.get('action')
      const module = url.searchParams.get('module')
      const apikey = url.searchParams.get('apikey')

      if (apikey === 'invalid-key') {
        return HttpResponse.json({
          status: '0',
          message: 'NOTOK',
          result: 'Invalid API Key',
        })
      }

      // Block by timestamp
      if (module === 'block' && action === 'getblocknobytime') {
        const timestamp = url.searchParams.get('timestamp') || ''
        const blockNumber = blockByTimestamp[timestamp] || '1000000'
        return HttpResponse.json({
          status: '1',
          message: 'OK',
          result: blockNumber,
        })
      }

      // Token transfers
      if (module === 'account' && action === 'tokentx') {
        if (!transfers.length) {
          return HttpResponse.json({
            status: '0',
            message: 'No transactions found',
            result: [],
          })
        }
        return HttpResponse.json({
          status: '1',
          message: 'OK',
          result: transfers,
        })
      }

      return HttpResponse.json({
        status: '0',
        message: 'Unknown action',
        result: null,
      })
    }),
  ]
}

/** Returns 429 for the first N requests, then succeeds */
export function createRateLimitedEtherscanHandlers(
  failCount: number,
  transfers: EtherscanERC20Transfer[],
) {
  let requestCount = 0

  return [
    http.get(API_V2_BASE, () => {
      requestCount++
      if (requestCount <= failCount) {
        return new HttpResponse(null, { status: 429 })
      }
      return HttpResponse.json({
        status: '1',
        message: 'OK',
        result: transfers,
      })
    }),
  ]
}
