/**
 * Parses Etherscan ERC20 token transfer CSV exports.
 *
 * Expected CSV format (from etherscan.io "Download CSV Export"):
 *   "Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","Quantity","Method"
 */
import Papa from 'papaparse'
import { parseUnits } from 'viem'
import type { EtherscanTransfer } from '@/types'

/** Normalized header names after lowercasing + stripping non-alphanumeric chars */
const REQUIRED_HEADERS = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'quantity']

export interface ParseEtherscanCsvParams {
  text: string
  tokenAddress: string
  tokenDecimals: number
}

export function parseEtherscanCsv({
  text,
  tokenAddress,
  tokenDecimals,
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
  const hasValidFormat = REQUIRED_HEADERS.every((h) =>
    headers.some((header) => header.includes(h)),
  )

  if (!hasValidFormat) {
    throw new Error(
      'Invalid CSV format. Expected Etherscan ERC20 transfer CSV with columns: Transaction Hash, Blockno, UnixTimestamp, From, To, Quantity',
    )
  }

  const parsed: EtherscanTransfer[] = data.map((row) => {
    const rawQuantity = row['quantity'] || ''
    const rawValue = rawQuantity.includes('.')
      ? parseUnits(rawQuantity, tokenDecimals).toString()
      : rawQuantity

    return {
      hash: row['transactionhash'] || '',
      from: row['from'] || '',
      to: row['to'] || '',
      contractAddress: tokenAddress,
      value: rawValue,
      timeStamp: row['unixtimestamp'] || '',
      blockNumber: row['blockno'] || '',
    }
  })

  if (!parsed.length) {
    throw new Error('No valid transfers found in CSV')
  }

  return parsed
}
