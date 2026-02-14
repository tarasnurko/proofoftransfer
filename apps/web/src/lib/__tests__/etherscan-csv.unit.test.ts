import { describe, it, expect } from 'vitest'
import { parseEtherscanCsv } from '../etherscan-csv'

/** Real Etherscan ERC20 transfer CSV format */
const VALID_CSV = `"Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","Quantity","Method"
"0x9c9e84ef82d4418c3d6327c3be648d15a4dfa299e18fd9168bc60e4f3f31c444","80087529","1765280111","2025-12-09 11:35:11","0xf70da97812cb96acdf810712aa562db8dfa3dbef","0xffb51b3f5935148eeb07966afc7eba8b75901e04","10.013614","Transfer"
"0xfe1a003c8ce6c713a513a6064f9c63322ae41e2e4861d9038d984b2f833fe033","80425765","1765965061","2025-12-17 09:51:01","0xffb51b3f5935148eeb07966afc7eba8b75901e04","0xc5d563a36ae78145c45a50134d48a1215220f80a","0.999989","Match Orders"`

describe('parseEtherscanCsv', () => {
  it('parses real Etherscan ERC20 transfer CSV', () => {
    const result = parseEtherscanCsv({
      text: VALID_CSV,
      tokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      tokenDecimals: 6,
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      hash: '0x9c9e84ef82d4418c3d6327c3be648d15a4dfa299e18fd9168bc60e4f3f31c444',
      from: '0xf70da97812cb96acdf810712aa562db8dfa3dbef',
      to: '0xffb51b3f5935148eeb07966afc7eba8b75901e04',
      contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      value: '10013614',
      timeStamp: '1765280111',
      blockNumber: '80087529',
    })
  })

  it('converts decimal quantities to smallest unit', () => {
    const result = parseEtherscanCsv({
      text: VALID_CSV,
      tokenAddress: '0xToken',
      tokenDecimals: 6,
    })
    // "10.013614" with 6 decimals = 10013614
    expect(result[0]!.value).toBe('10013614')
    // "0.999989" with 6 decimals = 999989
    expect(result[1]!.value).toBe('999989')
  })

  it('handles 18-decimal tokens', () => {
    const csv18 = `"Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","Quantity","Method"
"0xabc","1000","1700000000","2023-11-14","0xA","0xB","1.5","Transfer"`

    const result = parseEtherscanCsv({
      text: csv18,
      tokenAddress: '0xToken',
      tokenDecimals: 18,
    })
    expect(result[0]!.value).toBe('1500000000000000000')
  })

  it('throws on missing required headers', () => {
    const badCsv = `"Name","Value"\n"test","123"`
    expect(() =>
      parseEtherscanCsv({ text: badCsv, tokenAddress: '0x1', tokenDecimals: 18 }),
    ).toThrow('Invalid CSV format')
  })

  it('throws on empty CSV', () => {
    const emptyCsv = `"Transaction Hash","Blockno","UnixTimestamp","From","To","Quantity"`
    expect(() =>
      parseEtherscanCsv({ text: emptyCsv, tokenAddress: '0x1', tokenDecimals: 18 }),
    ).toThrow('CSV file is empty')
  })
})
