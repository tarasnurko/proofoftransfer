import { describe, it, expect } from 'vitest'
import { parseEtherscanCsv } from '../etherscan-csv'

/** Real Etherscan ERC20 transfer CSV format */
const VALID_CSV = `"Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","Quantity","Method"
"0x9c9e84ef82d4418c3d6327c3be648d15a4dfa299e18fd9168bc60e4f3f31c444","80087529","1765280111","2025-12-09 11:35:11","0xf70da97812cb96acdf810712aa562db8dfa3dbef","0xffb51b3f5935148eeb07966afc7eba8b75901e04","10.013614","Transfer"
"0xfe1a003c8ce6c713a513a6064f9c63322ae41e2e4861d9038d984b2f833fe033","80425765","1765965061","2025-12-17 09:51:01","0xffb51b3f5935148eeb07966afc7eba8b75901e04","0xc5d563a36ae78145c45a50134d48a1215220f80a","0.999989","Match Orders"`

/** Real Etherscan NFT transfer CSV format (combined 721+1155) */
const NFT_CSV = `"Transaction Hash","Blockno","UnixTimestamp","DateTime (UTC)","From","To","ContractAddress","TokenName","TokenSymbol","Token ID","Type","Quantity"
"0x2b32d65d6e70247502a70969cad64930d8de886bea3f91f247bb12d27751ab4c","32394127","1751577601","2025-07-03 21:20:01","0x532f27101965dd16442e59d40670faf5ebb142e4","0x13f5620fccb28af63e237cc1fdf1eba235a2c016","0xd10ffc8ff04c49f0034bf26126f5110caf7f7b34","ERC-721 TOKEN*","ERC-721 TOKEN*","0","721","1"
"0x4744c8eee22b6b97f6fa56f955cb52f3d0d5a7e068e80af3f51754da209f67dd","33731060","1754251467","2025-08-03 20:04:27","0x74915b7fcc9ccca152a96bfda301eceea5951667","0x13f5620fccb28af63e237cc1fdf1eba235a2c016","0xe78e58f677c42e3037c3ff94e74c0709d34e448c","1","","0","1155","1"
"0x6bb5691d54a2f65abcb78cfeb3ac60fbf99af62efe9da5ac8c5e494923cb3e16","38127210","1763043767","2025-11-13 14:22:47","0x38f15d7339f6864289171978bd96a0f40b617be7","0x13f5620fccb28af63e237cc1fdf1eba235a2c016","0xd6ac3f9632ec700a3a1829a68f63e39e99112f34","0","","333","1155","1"`

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

  it('parses real Etherscan ERC-721 NFT CSV', () => {
    const result = parseEtherscanCsv({
      text: NFT_CSV,
      tokenAddress: '0xd10ffc8ff04c49f0034bf26126f5110caf7f7b34',
      tokenDecimals: 0,
      tokenType: 'erc721',
    })

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      hash: '0x2b32d65d6e70247502a70969cad64930d8de886bea3f91f247bb12d27751ab4c',
      from: '0x532f27101965dd16442e59d40670faf5ebb142e4',
      to: '0x13f5620fccb28af63e237cc1fdf1eba235a2c016',
      contractAddress: '0xd10ffc8ff04c49f0034bf26126f5110caf7f7b34',
      value: '1',
      tokenId: '0',
      timeStamp: '1751577601',
      blockNumber: '32394127',
    })
  })

  it('parses real Etherscan ERC-1155 NFT CSV', () => {
    const result = parseEtherscanCsv({
      text: NFT_CSV,
      tokenAddress: '0xe78e58f677c42e3037c3ff94e74c0709d34e448c',
      tokenDecimals: 0,
      tokenType: 'erc1155',
    })

    expect(result).toHaveLength(3)
    expect(result[1]).toEqual({
      hash: '0x4744c8eee22b6b97f6fa56f955cb52f3d0d5a7e068e80af3f51754da209f67dd',
      from: '0x74915b7fcc9ccca152a96bfda301eceea5951667',
      to: '0x13f5620fccb28af63e237cc1fdf1eba235a2c016',
      contractAddress: '0xe78e58f677c42e3037c3ff94e74c0709d34e448c',
      value: '1',
      tokenId: '0',
      timeStamp: '1754251467',
      blockNumber: '33731060',
    })
    // row with quantity=1 and tokenId=333
    expect(result[2]!.tokenId).toBe('333')
    expect(result[2]!.value).toBe('1')
  })
})
