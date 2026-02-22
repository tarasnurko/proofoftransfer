import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { ChildProcess, spawn } from 'child_process'
import { parseUnits, type Address } from 'viem'
import {
  ANVIL_ACCOUNTS,
  createAnvilClient,
  deployTestERC20,
  mintTokens,
  makeTransfers,
  readTransferEvents,
  type TransferSpec,
} from '@repo/test-utils'
import { seedClaim, seedProof, seedToken, seedTransfer, truncateAll, closeDb } from './helpers/db'

const FIXTURE_DIR = join(process.cwd(), 'e2e/.fixtures')
const FIXTURE_PATH = join(FIXTURE_DIR, 'test-data.json')

const ANVIL_PORT = 8545
const ANVIL_RPC = `http://127.0.0.1:${ANVIL_PORT}`

const TST = { name: 'Test Token', symbol: 'TST', decimals: 18, chainId: 1 } as const
const USDC = { name: 'USD Coin', symbol: 'USDC', decimals: 6, chainId: 8453 } as const

let anvilProcess: ChildProcess | null = null

async function isAnvilRunning(): Promise<boolean> {
  try {
    const res = await fetch(ANVIL_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function startAnvil(): Promise<void> {
  if (await isAnvilRunning()) return

  anvilProcess = spawn('anvil', ['--host', '127.0.0.1', '--port', String(ANVIL_PORT)], {
    stdio: 'ignore',
    detached: true,
  })

  for (let i = 0; i < 30; i++) {
    if (await isAnvilRunning()) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('Anvil failed to start within 15s')
}

export default async function globalSetup() {
  mkdirSync(FIXTURE_DIR, { recursive: true })

  await startAnvil()

  const deployer = ANVIL_ACCOUNTS[0]!
  const client = createAnvilClient(deployer.key)

  const senders = [ANVIL_ACCOUNTS[1]!, ANVIL_ACCOUNTS[2]!, ANVIL_ACCOUNTS[3]!]
  const recipient = ANVIL_ACCOUNTS[4]!
  const noiseSender = ANVIL_ACCOUNTS[5]!
  const noiseRecipient = ANVIL_ACCOUNTS[6]!

  // Deploy tokens
  const tstAddress = await deployTestERC20(client, TST.name, TST.symbol, TST.decimals)
  const usdcAddress = await deployTestERC20(client, USDC.name, USDC.symbol, USDC.decimals)

  // Mint to all participants (senders + noiseSender + recipient for outgoing transfers)
  const allMintTargets = [
    ...senders.map((s) => s.address),
    noiseSender.address,
    recipient.address,
  ] as Address[]
  await mintTokens(client, tstAddress, allMintTargets, parseUnits('100000', TST.decimals))
  await mintTokens(client, usdcAddress, allMintTargets, parseUnits('100000', USDC.decimals))

  // Interleaved transfers — mix tokens, noise, and recipient outgoing
  const transfers: TransferSpec[] = [
    { from: senders[0]!.key, to: recipient.address, amount: parseUnits('100', TST.decimals), tokenAddress: tstAddress },
    { from: senders[0]!.key, to: recipient.address, amount: parseUnits('1000', USDC.decimals), tokenAddress: usdcAddress },
    { from: noiseSender.key, to: noiseRecipient.address, amount: parseUnits('42', TST.decimals), tokenAddress: tstAddress },
    { from: senders[1]!.key, to: recipient.address, amount: parseUnits('250', TST.decimals), tokenAddress: tstAddress },
    { from: recipient.key, to: noiseSender.address, amount: parseUnits('50', TST.decimals), tokenAddress: tstAddress },
    { from: senders[1]!.key, to: recipient.address, amount: parseUnits('2500', USDC.decimals), tokenAddress: usdcAddress },
    { from: noiseSender.key, to: noiseRecipient.address, amount: parseUnits('77', USDC.decimals), tokenAddress: usdcAddress },
    { from: senders[2]!.key, to: recipient.address, amount: parseUnits('500', TST.decimals), tokenAddress: tstAddress },
    { from: recipient.key, to: noiseSender.address, amount: parseUnits('100', USDC.decimals), tokenAddress: usdcAddress },
  ]
  await makeTransfers(transfers)

  // Read on-chain events filtered by recipient
  const tstTransfers = await readTransferEvents(client, tstAddress, recipient.address)
  const usdcTransfers = await readTransferEvents(client, usdcAddress, recipient.address)

  // Seed DB
  await truncateAll()

  const tstToken = await seedToken({
    address: tstAddress.toLowerCase(),
    chainId: TST.chainId,
    name: TST.name,
    symbol: TST.symbol,
    decimals: TST.decimals,
  })

  const usdcToken = await seedToken({
    address: usdcAddress.toLowerCase(),
    chainId: USDC.chainId,
    name: USDC.name,
    symbol: USDC.symbol,
    decimals: USDC.decimals,
  })

  // Seed 15 claims: 8 Ethereum (TST) + 7 Base (USDC)
  const claims = []
  for (let i = 0; i < 8; i++) {
    const claim = await seedClaim({
      message: `Ethereum claim #${i + 1}`,
      messageHash: '0x' + 'e'.repeat(62) + (i + 1).toString(16).padStart(2, '0'),
      tokenAddress: tstAddress.toLowerCase(),
      recipientAddress: recipient.address.toLowerCase(),
      minTransfersSum: '0',
      maxTransfersSum: '0',
      fromBlockTimestamp: 0,
      toBlockTimestamp: 0,
      chainId: TST.chainId,
      merkleRoot: '0x' + '0'.repeat(64),
    })
    claims.push(claim)
  }
  for (let i = 0; i < 7; i++) {
    const claim = await seedClaim({
      message: `Base claim #${i + 1}`,
      messageHash: '0x' + 'b'.repeat(62) + (i + 1).toString(16).padStart(2, '0'),
      tokenAddress: usdcAddress.toLowerCase(),
      recipientAddress: recipient.address.toLowerCase(),
      minTransfersSum: '0',
      maxTransfersSum: '0',
      fromBlockTimestamp: 0,
      toBlockTimestamp: 0,
      chainId: USDC.chainId,
      merkleRoot: '0x' + '0'.repeat(64),
    })
    claims.push(claim)
  }

  // Seed proofs: claims[0] gets 3, claims[1] gets 1
  const proofs = []
  for (let i = 0; i < 3; i++) {
    const proof = await seedProof({
      claimId: claims[0]!.id,
      nullifier: '0x' + 'a'.repeat(62) + i.toString(16).padStart(2, '0'),
      proofData: '0x' + 'cd'.repeat(64),
      publicInputs: ['0x01', '0x02'],
    })
    proofs.push(proof)
  }
  const singleProof = await seedProof({
    claimId: claims[1]!.id,
    nullifier: '0x' + 'bb'.repeat(32),
    proofData: '0x' + 'ef'.repeat(64),
    publicInputs: ['0x03', '0x04'],
  })
  proofs.push(singleProof)

  // Seed transfers from real Anvil events
  let logIdx = 0
  for (const t of tstTransfers) {
    await seedTransfer({
      chainId: TST.chainId,
      txHash: t.hash,
      logIndex: logIdx++,
      blockNumber: Number(t.blockNumber),
      blockTimestamp: Number(t.timeStamp),
      senderAddress: t.from.toLowerCase(),
      recipientAddress: t.to.toLowerCase(),
      tokenAddress: tstAddress.toLowerCase(),
      amount: t.value,
    })
  }
  for (const t of usdcTransfers) {
    await seedTransfer({
      chainId: USDC.chainId,
      txHash: t.hash,
      logIndex: logIdx++,
      blockNumber: Number(t.blockNumber),
      blockTimestamp: Number(t.timeStamp),
      senderAddress: t.from.toLowerCase(),
      recipientAddress: t.to.toLowerCase(),
      tokenAddress: usdcAddress.toLowerCase(),
      amount: t.value,
    })
  }

  await closeDb()

  // Write fixture data
  writeFileSync(
    FIXTURE_PATH,
    JSON.stringify(
      {
        tokens: {
          tst: {
            id: tstToken.id,
            address: tstAddress.toLowerCase(),
            name: TST.name,
            symbol: TST.symbol,
            decimals: TST.decimals,
            chainId: TST.chainId,
          },
          usdc: {
            id: usdcToken.id,
            address: usdcAddress.toLowerCase(),
            name: USDC.name,
            symbol: USDC.symbol,
            decimals: USDC.decimals,
            chainId: USDC.chainId,
          },
        },
        recipient: recipient.address.toLowerCase(),
        senders: senders.map((s) => s.address.toLowerCase()),
        senderKeys: senders.map((s) => s.key),
        claims: claims.map((c) => ({
          id: c.id,
          message: c.message,
          chainId: c.chainId,
          tokenAddress: c.tokenAddress,
        })),
        proofs: proofs.map((p) => ({
          id: p.id,
          claimId: p.claimId,
          nullifier: p.nullifier,
        })),
        tstTransfers: tstTransfers.map((t) => ({
          hash: t.hash,
          from: t.from.toLowerCase(),
          to: t.to.toLowerCase(),
          value: t.value,
          blockNumber: t.blockNumber,
          timeStamp: t.timeStamp,
        })),
        usdcTransfers: usdcTransfers.map((t) => ({
          hash: t.hash,
          from: t.from.toLowerCase(),
          to: t.to.toLowerCase(),
          value: t.value,
          blockNumber: t.blockNumber,
          timeStamp: t.timeStamp,
        })),
      },
      null,
      2,
    ),
  )

  // Save anvil PID for teardown
  if (anvilProcess?.pid) {
    writeFileSync(join(FIXTURE_DIR, 'anvil.pid'), String(anvilProcess.pid))
  }
}
