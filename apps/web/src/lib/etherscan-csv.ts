/**
 * Parses Etherscan token transfer CSV exports.
 *
 * Supported formats:
 *   ERC-20:  Transaction Hash, Blockno, UnixTimestamp, From, To, Quantity
 *   ERC-721: Transaction Hash, Blockno, UnixTimestamp, From, To, TokenId
 *   ERC-1155: Transaction Hash, Blockno, UnixTimestamp, From, To, TokenId, TokenValue
 */
import Papa from 'papaparse'
import { parseUnits } from 'viem'
import type { EtherscanTransfer } from '@/types'

const ERC20_HEADERS = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'quantity']
const ERC721_HEADERS = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'tokenid']
const ERC1155_HEADERS = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'tokenid', 'tokenvalue']

const FORMAT_HINTS: Record<string, string> = {
  erc20: 'Transaction Hash, Blockno, UnixTimestamp, From, To, Quantity',
  erc721: 'Transaction Hash, Blockno, UnixTimestamp, From, To, TokenId',
  erc1155: 'Transaction Hash, Blockno, UnixTimestamp, From, To, TokenId, TokenValue',
}

export interface ParseEtherscanCsvParams {
  text: string
  tokenAddress: string
  tokenDecimals: number
  tokenType?: string
}

export function getExpectedCsvFormat(tokenType?: string): string {
  return FORMAT_HINTS[tokenType || 'erc20'] || FORMAT_HINTS.erc20!
}

export function parseEtherscanCsv({
  text,
  tokenAddress,
  tokenDecimals,
  tokenType = 'erc20',
}: ParseEtherscanCsvParams): EtherscanTransfer[] {
  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  })

  if (errors.length) {
    throw new Error(`CSV parse error: ${errors[0]!.message}`)
  }

  if (!data.length) {
    throw new Error('CSV file is empty or has no data rows')
  }

  const headers = Object.keys(data[0]!)
  const requiredHeaders = getRequiredHeaders(tokenType)
  const hasValidFormat = requiredHeaders.every((h) =>
    headers.some((header) => header.includes(h)),
  )

  if (!hasValidFormat) {
    throw new Error(
      `Invalid CSV format. Expected ${tokenType.toUpperCase()} transfer CSV with columns: ${getExpectedCsvFormat(tokenType)}`,
    )
  }

  const parsed: EtherscanTransfer[] = data.map((row) => {
    const base = {
      hash: row['transactionhash'] || '',
      from: row['from'] || '',
      to: row['to'] || '',
      contractAddress: tokenAddress,
      timeStamp: row['unixtimestamp'] || '',
      blockNumber: row['blockno'] || '',
    }

    if (tokenType === 'erc721') {
      return {
        ...base,
        value: '1',
        tokenId: row['tokenid'] || '0',
      }
    }

    if (tokenType === 'erc1155') {
      return {
        ...base,
        value: row['tokenvalue'] || '0',
        tokenId: row['tokenid'] || '0',
      }
    }

    const rawQuantity = row['quantity'] || ''
    const rawValue = rawQuantity.includes('.')
      ? parseUnits(rawQuantity, tokenDecimals).toString()
      : rawQuantity

    return { ...base, value: rawValue }
  })

  if (!parsed.length) {
    throw new Error('No valid transfers found in CSV')
  }

  return parsed
}

function getRequiredHeaders(tokenType: string): string[] {
  if (tokenType === 'erc721') return ERC721_HEADERS
  if (tokenType === 'erc1155') return ERC1155_HEADERS
  return ERC20_HEADERS
}
