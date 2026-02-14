import type { Hex } from 'viem'
import type { EtherscanERC20Transfer } from '@repo/types'
import { generateEthereumAddress } from './accounts'

const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const generateRandomTransferAmount = (decimals: number = 18): string => {
  const base = BigInt(getRandomInt(1, 1_000_000))
  const multiplier = 10n ** BigInt(decimals)
  return (base * multiplier).toString()
}

const generateRandomHex = (length: number): Hex => {
  const bytes = Array.from({ length: length / 2 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  ).join('')
  return `0x${bytes}`
}

export const generateTransfer = ({
  from,
  to,
  tokenAddress,
}: {
  from?: string
  to?: string
  tokenAddress?: string
}): EtherscanERC20Transfer => {
  const now = Math.floor(Date.now() / 1000)
  const blockNumber = getRandomInt(10000000, 20000000)

  return {
    blockNumber: blockNumber.toString(),
    timeStamp: (now - getRandomInt(0, 86400)).toString(),
    hash: generateRandomHex(64),
    nonce: getRandomInt(0, 1000).toString(),
    blockHash: generateRandomHex(64),
    contractAddress: tokenAddress || generateEthereumAddress(),
    from: from || generateEthereumAddress(),
    to: to || generateEthereumAddress(),
    value: generateRandomTransferAmount(),
    tokenName: 'Test Token',
    tokenSymbol: 'TST',
    tokenDecimal: '18',
    transactionIndex: getRandomInt(0, 100).toString(),
    gas: getRandomInt(21000, 100000).toString(),
    gasPrice: (getRandomInt(1, 100) * 10 ** 9).toString(),
    gasUsed: getRandomInt(21000, 100000).toString(),
    cumulativeGasUsed: getRandomInt(100000, 10000000).toString(),
    input: '0xa9059cbb',
    methodId: '0xa9059cbb',
    functionName: 'transfer(address _to, uint256 _value)',
    confirmations: getRandomInt(1, 1000).toString(),
  }
}

export const generateTransfers = (
  transferParams: { from?: string; to?: string; tokenAddress?: string },
  amount: number = 1,
): EtherscanERC20Transfer[] => {
  if (!amount) {
    amount = getRandomInt(1, 10)
  }
  return Array(amount)
    .fill(null)
    .map(() => generateTransfer(transferParams))
}

export const generateRandomTransfers = (
  amount: number = 1,
): EtherscanERC20Transfer[] => {
  return Array(amount)
    .fill(null)
    .map(() =>
      generateTransfer({
        from: generateEthereumAddress(),
        to: generateEthereumAddress(),
        tokenAddress: generateEthereumAddress(),
      }),
    )
}
