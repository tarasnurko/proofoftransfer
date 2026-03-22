import { readFileSync } from 'fs'
import { join } from 'path'

export interface TestTransfer {
  hash: string
  from: string
  to: string
  value: string
  blockNumber: string
  timeStamp: string
}

export interface TestToken {
  id: string
  address: string
  name: string
  symbol: string
  decimals: number
  chainId: number
}

export interface TestClaim {
  id: string
  message: string
  chainId: number
  tokenAddress: string
}

export interface TestProof {
  id: string
  claimId: string
  nullifier: string
}

export interface TestFixtures {
  tokens: {
    tst: TestToken
    usdc: TestToken
  }
  recipient: string
  counterpartyShared: string  // recipient address, has ENS "gooddao.eth", used by most claims
  counterpartyUnique: string  // uniqueCounterparty1 address, has ENS "devguild.eth", used by exactly 1 claim
  senders: string[]
  senderKeys: string[]
  claims: TestClaim[]
  proofs: TestProof[]
  tstTransfers: TestTransfer[]
  usdcTransfers: TestTransfer[]
}

export function loadFixtures(): TestFixtures {
  const fixturePath = join(process.cwd(), 'e2e/.fixtures/test-data.json')
  return JSON.parse(readFileSync(fixturePath, 'utf-8'))
}
