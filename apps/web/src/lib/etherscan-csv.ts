/**
 * Parses Etherscan token transfer CSV exports.
 *
 * Supported formats:
 *   ERC-20:     Transaction Hash, Blockno, UnixTimestamp, DateTime (UTC), From, To, Quantity, Method
 *   NFT (721+1155): Transaction Hash, Blockno, UnixTimestamp, DateTime (UTC), From, To, ContractAddress, TokenName, TokenSymbol, Token ID, Type, Quantity
 */
import Papa from 'papaparse'
import { parseUnits } from 'viem'
import { TokenType } from '@repo/types'
import type { EtherscanTransfer } from '@/types'

const ERC20_HEADERS = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'quantity']
const NFT_HEADERS = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'tokenid', 'type', 'quantity']

const FORMAT_HINTS: Record<string, string> = {
  erc20: 'Transaction Hash, Blockno, UnixTimestamp, From, To, Quantity',
  nft: 'Transaction Hash, Blockno, UnixTimestamp, From, To, Token ID, Type, Quantity',
}

export interface ParseEtherscanCsvParams {
  text: string
  tokenAddress: string
  tokenDecimals: number
  tokenType?: TokenType
}

export function getExpectedCsvFormat(tokenType?: TokenType): string {
  const key = tokenType === TokenType.ERC20 || !tokenType ? 'erc20' : 'nft'
  return FORMAT_HINTS[key]!
}

export function parseEtherscanCsv({
  text,
  tokenAddress,
  tokenDecimals,
  tokenType = TokenType.ERC20,
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
  const isNft = tokenType === TokenType.ERC721 || tokenType === TokenType.ERC1155
  const requiredHeaders = isNft ? NFT_HEADERS : ERC20_HEADERS
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

    if (tokenType === TokenType.ERC721) {
      return {
        ...base,
        value: '1',
        tokenId: row['tokenid'] || '0',
      }
    }

    if (tokenType === TokenType.ERC1155) {
      return {
        ...base,
        value: row['quantity'] || '0',
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
