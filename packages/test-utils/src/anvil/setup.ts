import {
  createWalletClient,
  http,
  parseAbi,
  publicActions,
  type Address,
  type Hex,
  getAddress,
} from 'viem'
import { foundry } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import type { EtherscanERC20Transfer } from '@repo/types'
import { TEST_ERC20_ABI, TEST_ERC20_BYTECODE } from '../contracts/erc20'

const ANVIL_RPC = 'http://127.0.0.1:8545'

export function createAnvilClient(privateKey: Hex) {
  return createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: foundry,
    transport: http(ANVIL_RPC),
  }).extend(publicActions)
}

export type AnvilClient = ReturnType<typeof createAnvilClient>

export async function deployTestERC20(
  client: AnvilClient,
  name = 'Test Token',
  symbol = 'TST',
  decimals = 18,
): Promise<Address> {
  const hash = await client.deployContract({
    abi: TEST_ERC20_ABI,
    bytecode: TEST_ERC20_BYTECODE,
    args: [name, symbol, decimals],
  })
  const receipt = await client.waitForTransactionReceipt({ hash })
  if (!receipt.contractAddress) throw new Error('ERC20 deploy failed')
  return receipt.contractAddress
}

export async function mintTokens(
  client: AnvilClient,
  tokenAddress: Address,
  recipients: Address[],
  amount: bigint,
) {
  for (const to of recipients) {
    const hash = await client.writeContract({
      address: tokenAddress,
      abi: TEST_ERC20_ABI,
      functionName: 'mint',
      args: [to, amount],
    })
    await client.waitForTransactionReceipt({ hash })
  }
}

export interface TransferSpec {
  from: Hex // private key
  to: Address
  amount: bigint
  tokenAddress: Address
}

export async function makeTransfers(transfers: TransferSpec[]) {
  for (const t of transfers) {
    const client = createAnvilClient(t.from)
    const hash = await client.writeContract({
      address: t.tokenAddress,
      abi: TEST_ERC20_ABI,
      functionName: 'transfer',
      args: [t.to, t.amount],
    })
    await client.waitForTransactionReceipt({ hash })
  }
}

export async function readTransferEvents(
  client: AnvilClient,
  tokenAddress: Address,
  recipient?: Address,
): Promise<EtherscanERC20Transfer[]> {
  const logs = await client.getLogs({
    address: tokenAddress,
    event: parseAbi(['event Transfer(address indexed from, address indexed to, uint256 value)'])[0],
    fromBlock: 0n,
    toBlock: 'latest',
    ...(recipient ? { args: { to: recipient } } : {}),
  })

  const results: EtherscanERC20Transfer[] = []

  for (const log of logs) {
    const block = await client.getBlock({ blockNumber: log.blockNumber })
    const tx = await client.getTransaction({ hash: log.transactionHash })

    results.push({
      blockNumber: log.blockNumber.toString(),
      timeStamp: block.timestamp.toString(),
      hash: log.transactionHash,
      nonce: tx.nonce.toString(),
      blockHash: log.blockHash,
      from: getAddress(log.args.from!),
      contractAddress: getAddress(tokenAddress),
      to: getAddress(log.args.to!),
      value: (log.args.value!).toString(),
      tokenName: 'Test Token',
      tokenSymbol: 'TST',
      tokenDecimal: '18',
      transactionIndex: log.transactionIndex!.toString(),
      gas: tx.gas.toString(),
      gasPrice: (tx.gasPrice || 0n).toString(),
      gasUsed: '0',
      cumulativeGasUsed: '0',
      input: tx.input,
      methodId: tx.input.slice(0, 10),
      functionName: 'transfer(address,uint256)',
      confirmations: '1',
    })
  }

  return results
}
