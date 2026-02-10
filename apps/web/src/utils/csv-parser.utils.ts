import { parseUnits } from 'viem'
import type { EtherscanTransfer } from '@/types'

const REQUIRED_HEADERS = ['transactionhash', 'blockno', 'unixtimestamp', 'from', 'to', 'quantity']

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

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
  const lines = text.split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows')
  }

  const headerLine = lines[0]!.toLowerCase().replace(/["'\s]/g, '')
  const hasValidFormat = REQUIRED_HEADERS.every(header => headerLine.includes(header))

  if (!hasValidFormat) {
    throw new Error(
      'Invalid CSV format. Expected columns: Transaction Hash, Blockno, UnixTimestamp, From, To, Quantity'
    )
  }

  const headers = parseCsvLine(headerLine).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))
  const parsed: EtherscanTransfer[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]!)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.replace(/^"|"$/g, '') || ''
    })

    const rawQuantity = row['quantity'] || row['value'] || row['amount'] || ''
    const rawValue = rawQuantity.includes('.')
      ? parseUnits(rawQuantity, tokenDecimals).toString()
      : rawQuantity

    parsed.push({
      hash: row['transactionhash'] || row['txhash'] || row['hash'] || '',
      from: row['from'] || '',
      to: row['to'] || '',
      contractAddress: tokenAddress,
      value: rawValue,
      timeStamp: row['unixtimestamp'] || row['timestamp'] || '',
      blockNumber: row['blockno'] || row['blocknumber'] || row['block'] || '',
    })
  }

  if (!parsed.length) {
    throw new Error('No valid transfers found in CSV')
  }

  return parsed
}
