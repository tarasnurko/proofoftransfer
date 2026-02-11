import Papa from 'papaparse'
import { parseUnits } from 'viem'
import type { EtherscanTransfer } from '@/types'

const REQUIRED_HEADERS = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'quantity']

export interface ParseCsvTransfersParams {
  text: string
  tokenAddress: string
  tokenDecimals: number
}

export function parseCsvTransfers({
  text,
  tokenAddress,
  tokenDecimals,
}: ParseCsvTransfersParams): EtherscanTransfer[] {
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
      'Invalid CSV format. Expected columns: Transaction Hash, Blockno, UnixTimestamp, From, To, Quantity',
    )
  }

  const parsed: EtherscanTransfer[] = data.map((row) => {
    const rawQuantity = row['quantity'] || row['value'] || row['amount'] || ''
    const rawValue = rawQuantity.includes('.')
      ? parseUnits(rawQuantity, tokenDecimals).toString()
      : rawQuantity

    return {
      hash: row['transactionhash'] || row['txhash'] || row['hash'] || '',
      from: row['from'] || '',
      to: row['to'] || '',
      contractAddress: tokenAddress,
      value: rawValue,
      timeStamp: row['unixtimestamp'] || row['timestamp'] || '',
      blockNumber: row['blockno'] || row['blocknumber'] || row['block'] || '',
    }
  })

  if (!parsed.length) {
    throw new Error('No valid transfers found in CSV')
  }

  return parsed
}
