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
  buildClaimSeed,
  buildProofSeed,
  buildTokenSeed,
  type TransferSpec,
} from '@repo/test-utils'
import { seedClaim, seedProof, seedToken, seedTransfer, seedEnsCache, truncateAll, closeDb } from './helpers/db'

const FIXTURE_DIR = join(process.cwd(), 'e2e/.fixtures')
const FIXTURE_PATH = join(FIXTURE_DIR, 'test-data.json')

const ANVIL_PORT = 8545
const ANVIL_RPC = `http://127.0.0.1:${ANVIL_PORT}`

const TST = { name: 'Test Token', symbol: 'TST', decimals: 18, chainId: 1 } as const
const USDC = { name: 'USD Coin', symbol: 'USDC', decimals: 6, chainId: 8453 } as const
const NFT1 = { name: 'Art Collection', symbol: 'ART', decimals: 0, chainId: 1 } as const
const NFT2 = { name: 'Game Items', symbol: 'ITEM', decimals: 0, chainId: 8453 } as const

// Fixed fake addresses for non-deployed tokens (only used in DB, not on-chain)
const NFT1_ADDRESS = '0xaaaa000000000000000000000000000000000001'
const NFT2_ADDRESS = '0xbbbb000000000000000000000000000000000002'

// Timestamp offsets — applied relative to Anvil's block time (computed at runtime)
// so date-filtered claims always match the seeded transfers regardless of when tests run
const ONE_HOUR = 3600
const ONE_DAY = 86400
const ONE_QUARTER = 90 * ONE_DAY

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
  const uniqueCounterparty1 = ANVIL_ACCOUNTS[7]!
  const uniqueCounterparty2 = ANVIL_ACCOUNTS[8]!
  const uniqueCounterparty3 = ANVIL_ACCOUNTS[9]!

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
  // Enough variety to produce 8+ TST and 6+ USDC transfers to recipient
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
    // Additional transfers for more realistic data
    { from: senders[0]!.key, to: recipient.address, amount: parseUnits('75', TST.decimals), tokenAddress: tstAddress },
    { from: senders[2]!.key, to: recipient.address, amount: parseUnits('150', USDC.decimals), tokenAddress: usdcAddress },
    { from: senders[1]!.key, to: recipient.address, amount: parseUnits('300', TST.decimals), tokenAddress: tstAddress },
    { from: senders[0]!.key, to: recipient.address, amount: parseUnits('800', USDC.decimals), tokenAddress: usdcAddress },
    { from: noiseSender.key, to: noiseRecipient.address, amount: parseUnits('33', TST.decimals), tokenAddress: tstAddress },
    { from: senders[2]!.key, to: recipient.address, amount: parseUnits('420', TST.decimals), tokenAddress: tstAddress },
    { from: senders[0]!.key, to: recipient.address, amount: parseUnits('3000', USDC.decimals), tokenAddress: usdcAddress },
    { from: senders[1]!.key, to: recipient.address, amount: parseUnits('175', TST.decimals), tokenAddress: tstAddress },
    { from: senders[2]!.key, to: recipient.address, amount: parseUnits('600', USDC.decimals), tokenAddress: usdcAddress },
    { from: senders[2]!.key, to: recipient.address, amount: parseUnits('90', TST.decimals), tokenAddress: tstAddress },
    { from: senders[1]!.key, to: recipient.address, amount: parseUnits('450', USDC.decimals), tokenAddress: usdcAddress },
  ]
  await makeTransfers(transfers)

  // Read on-chain events filtered by recipient
  const tstTransfers = await readTransferEvents(client, tstAddress, recipient.address)
  const usdcTransfers = await readTransferEvents(client, usdcAddress, recipient.address)

  // Derive date ranges from Anvil's actual block time so claims with date
  // constraints always include the seeded transfers
  const latestBlock = await client.getBlock({ blockTag: 'latest' })
  const anvilNow = Number(latestBlock.timestamp)
  const TS_RANGE_START = anvilNow - ONE_QUARTER  // ~90 days before transfers
  const TS_RANGE_END = anvilNow + ONE_HOUR       // just after transfers
  const TS_RANGE_START_2 = anvilNow - 2 * ONE_QUARTER
  const TS_RANGE_END_2 = anvilNow + ONE_DAY

  // Seed DB
  await truncateAll()

  const tstToken = await seedToken(buildTokenSeed({
    address: tstAddress.toLowerCase(),
    chainId: TST.chainId,
    name: TST.name,
    symbol: TST.symbol,
    decimals: TST.decimals,
  }))

  const usdcToken = await seedToken(buildTokenSeed({
    address: usdcAddress.toLowerCase(),
    chainId: USDC.chainId,
    name: USDC.name,
    symbol: USDC.symbol,
    decimals: USDC.decimals,
  }))

  await seedToken(buildTokenSeed({ address: NFT1_ADDRESS, chainId: NFT1.chainId, name: NFT1.name, symbol: NFT1.symbol, decimals: NFT1.decimals }))
  await seedToken(buildTokenSeed({ address: NFT2_ADDRESS, chainId: NFT2.chainId, name: NFT2.name, symbol: NFT2.symbol, decimals: NFT2.decimals }))

  // ENS records for two counterparties
  await seedEnsCache({ address: recipient.address.toLowerCase(), name: 'gooddao.eth', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), resolvedAt: new Date() })
  await seedEnsCache({ address: uniqueCounterparty1.address.toLowerCase(), name: 'devguild.eth', expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), resolvedAt: new Date() })

  // 18 diverse claims: 10 Ethereum + 8 Base
  // Variety: different token types, ENS counterparties, dates, constraints, message lengths, prover roles
  const claims = []

  // ── Ethereum claims (chain 1) ──

  // 1. TST ERC20, recipient has ENS, all constraints filled, prover=sender
  //    proofs[0..2] reference this claim — date range must include Anvil transfer timestamps
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Prove I donated 100 TST to the public goods fund',
    tokenAddress: tstAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: true,
    fromBlockTimestamp: TS_RANGE_START,
    toBlockTimestamp: TS_RANGE_END,
    minTransfersSum: '50000000000000000000',
    maxTransfersSum: '500000000000000000000',
    minTransfersCount: 2,
    maxTransfersCount: 10,
  })))

  // 2. Long message, TST ERC20, unique counterparty with ENS, has toDate, prover=sender
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Verify that my open-source grant payment was sent to the core development team before the Q2 2024 funding deadline as required by the grant agreement',
    tokenAddress: tstAddress.toLowerCase(),
    counterpartyAddress: uniqueCounterparty1.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: true,
    toBlockTimestamp: TS_RANGE_END,
  })))

  // 3. TST ERC20, recipient, prover=recipient (received), minTransfersCount
  claims.push(await seedClaim(buildClaimSeed({
    message: 'DAO contributor received at least 3 weekly reward transfers',
    tokenAddress: tstAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: false,
    minTransfersCount: 3,
  })))

  // 4. NFT ERC721, recipient, prover=sender, no dates
  claims.push(await seedClaim(buildClaimSeed({
    message: 'NFT royalty payment proof',
    tokenAddress: NFT1_ADDRESS,
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: true,
    tokenType: 'erc721',
  })))

  // 5. TST ERC20, unique counterparty2, amount range constraint
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Token sale participation between 500 and 5000 TST',
    tokenAddress: tstAddress.toLowerCase(),
    counterpartyAddress: uniqueCounterparty2.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: true,
    minTransfersSum: '500000000000000000000',
    maxTransfersSum: '5000000000000000000000',
  })))

  // 6. NFT ERC721, unique counterparty3, no dates, prover=sender
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Protocol upgrade bounty',
    tokenAddress: NFT1_ADDRESS,
    counterpartyAddress: uniqueCounterparty3.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: true,
    tokenType: 'erc721',
  })))

  // 7. TST ERC20, recipient, prover=recipient, date range Q1 2025
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Prove I received liquidity rewards during Q1 2025',
    tokenAddress: tstAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: false,
    fromBlockTimestamp: TS_RANGE_START,
    toBlockTimestamp: TS_RANGE_END,
  })))

  // 8. TST ERC20, recipient, very long message, maxTransfersCount
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Staking reward distribution for Q1 2025 validators who maintained 99% uptime during the network upgrade — no more than 5 transfers',
    tokenAddress: tstAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: true,
    maxTransfersCount: 5,
  })))

  // ── Base claims (chain 8453) ──

  // 9. Short message, USDC ERC20, recipient, no constraints
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Base bridge USDC',
    tokenAddress: usdcAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: USDC.chainId,
    isProverSender: true,
  })))

  // 10. Medium message, USDC ERC20, recipient (ENS), prover=recipient, minTransfersCount
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Monthly salary payment proof for remote contractor Jan–Mar 2025',
    tokenAddress: usdcAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: USDC.chainId,
    isProverSender: false,
    minTransfersCount: 1,
    fromBlockTimestamp: TS_RANGE_START,
    toBlockTimestamp: TS_RANGE_END,
  })))

  // 11. USDC ERC20, recipient, from+to date range
  claims.push(await seedClaim(buildClaimSeed({
    message: 'DeFi yield farming claim for period 2024 Q1',
    tokenAddress: usdcAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: USDC.chainId,
    isProverSender: true,
    fromBlockTimestamp: TS_RANGE_START,
    toBlockTimestamp: TS_RANGE_END,
  })))

  // 12. ERC1155, recipient, prover=recipient
  claims.push(await seedClaim(buildClaimSeed({
    message: 'NFT collection royalties distribution',
    tokenAddress: NFT2_ADDRESS,
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: USDC.chainId,
    isProverSender: false,
    tokenType: 'erc1155',
  })))

  // 13. USDC ERC20, recipient, prover=sender, no constraints
  claims.push(await seedClaim(buildClaimSeed({
    message: 'USDC swap proof',
    tokenAddress: usdcAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: USDC.chainId,
    isProverSender: true,
  })))

  // 14. USDC ERC20, recipient, min amount + max count
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Protocol fee collection — minimum 100 USDC, up to 10 transfers',
    tokenAddress: usdcAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: USDC.chainId,
    isProverSender: true,
    minTransfersSum: '100000000',
    maxTransfersCount: 10,
  })))

  // 15. Long message, USDC ERC20, recipient, toDate only
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Base ecosystem early adopter airdrop — proof of participation before the official launch date on 2025-01-01',
    tokenAddress: usdcAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: USDC.chainId,
    isProverSender: true,
    toBlockTimestamp: TS_RANGE_END,
  })))

  // 16. TST ERC20, all constraints, huge numbers
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Whale treasury rebalance — massive cross-protocol transfer batch',
    tokenAddress: tstAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: true,
    fromBlockTimestamp: TS_RANGE_START_2,
    toBlockTimestamp: TS_RANGE_END_2,
    minTransfersSum: '999999000000000000000000',
    maxTransfersSum: '50000000000000000000000000',
    minTransfersCount: 100,
    maxTransfersCount: 9999,
  })))

  // 17. TST ERC20, mixed one-sided constraints: min amount only + max count only
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Partial constraints — min amount with max transfer count',
    tokenAddress: tstAddress.toLowerCase(),
    counterpartyAddress: uniqueCounterparty2.address.toLowerCase(),
    chainId: TST.chainId,
    isProverSender: true,
    fromBlockTimestamp: TS_RANGE_START,
    toBlockTimestamp: TS_RANGE_END,
    minTransfersSum: '1000000000000000000000',
    maxTransfersCount: 5,
  })))

  // 18. USDC ERC20, mixed one-sided constraints: max amount only + min count only
  claims.push(await seedClaim(buildClaimSeed({
    message: 'Capped amount with minimum transfer count requirement',
    tokenAddress: usdcAddress.toLowerCase(),
    counterpartyAddress: recipient.address.toLowerCase(),
    chainId: USDC.chainId,
    isProverSender: false,
    fromBlockTimestamp: TS_RANGE_START,
    toBlockTimestamp: TS_RANGE_END,
    maxTransfersSum: '50000000000',
    minTransfersCount: 3,
  })))

  // Seed proofs: claims[0] gets 3 with varying messages, claims[1] gets 1
  const proofs = []
  proofs.push(await seedProof(buildProofSeed(claims[0]!.id, {
    message: 'Quick test proof for basic transfer verification',
  })))
  proofs.push(await seedProof(buildProofSeed(claims[0]!.id)))
  proofs.push(await seedProof(buildProofSeed(claims[0]!.id, {
    message: 'This is a comprehensive proof message demonstrating the full 500-character capacity of the message field. It includes detailed context about the transfer verification: the prover submitted on-chain evidence of 8 ERC-20 token transfers to the public goods fund over Q1 2024. All transfers were verified against the merkle root computed from the claim constraints. The zero-knowledge circuit confirmed sender identity without revealing the private key. Verification passed on first attempt.',
  })))
  const singleProof = await seedProof(buildProofSeed(claims[1]!.id))
  proofs.push(singleProof)

  // Seed transfers from real Anvil events
  for (const t of tstTransfers) {
    await seedTransfer({
      chainId: TST.chainId,
      txHash: t.hash,
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
        counterpartyShared: recipient.address.toLowerCase(),
        counterpartyUnique: uniqueCounterparty1.address.toLowerCase(),
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
