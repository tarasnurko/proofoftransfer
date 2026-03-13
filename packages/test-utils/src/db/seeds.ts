/**
 * DB seed helpers for integration tests.
 * These wrap the actual query functions from apps/web — import the db instance
 * and query functions in the test setup, then pass them here.
 *
 * Usage in tests:
 *   import { db } from '@/db/client'
 *   import { createClaim } from '@/db/queries/claims'
 *   import { seedClaim } from '@repo/test-utils'
 *   const claim = await seedClaim(createClaim, { message: 'test', ... })
 */

import { randomUUID } from 'crypto'
import { TokenType } from '@repo/types'

/** Minimal claim seed data — fills required fields with test defaults */
export function buildClaimSeed(overrides: Record<string, unknown> = {}) {
  return {
    message: 'Test claim message for integration testing',
    messageHash: '0x' + randomUUID().replace(/-/g, '').padEnd(64, '0'),
    tokenAddress: '0x' + '1'.repeat(40),
    counterpartyAddress: '0x' + '2'.repeat(40),
    isProverSender: true,
    tokenType: TokenType.ERC20,
    minTransfersSum: '0',
    maxTransfersSum: '0',
    minTransfersCount: 0,
    maxTransfersCount: 0,
    fromBlockTimestamp: 0,
    toBlockTimestamp: 0,
    chainId: 1,
    merkleRoot: '0x' + '0'.repeat(64),
    ...overrides,
  }
}

/** Minimal proof seed data */
export function buildProofSeed(claimId: string, overrides: Record<string, unknown> = {}) {
  return {
    claimId,
    nullifier: '0x' + randomUUID().replace(/-/g, '').padEnd(64, '0'),
    proofData: '0x' + 'ab'.repeat(32),
    publicInputs: ['0x01', '0x02'],
    ...overrides,
  }
}

/** Base transfer fields shared by all types */
function buildTransferBase(overrides: Record<string, unknown> = {}) {
  return {
    chainId: 1,
    txHash: '0x' + randomUUID().replace(/-/g, '').padEnd(64, '0'),
    logIndex: 0,
    blockNumber: 1000000,
    blockTimestamp: Math.floor(Date.now() / 1000),
    senderAddress: '0x' + '3'.repeat(40),
    recipientAddress: '0x' + '2'.repeat(40),
    tokenAddress: '0x' + '1'.repeat(40),
    ...overrides,
  }
}

/** Minimal ERC-20 transfer seed data */
export function buildErc20TransferSeed(overrides: Record<string, unknown> = {}) {
  return {
    ...buildTransferBase(overrides),
    amount: '1000000000000000000',
    ...overrides,
  }
}

/** Minimal ERC-721 transfer seed data */
export function buildErc721TransferSeed(overrides: Record<string, unknown> = {}) {
  return {
    ...buildTransferBase(overrides),
    tokenId: '1',
    ...overrides,
  }
}

/** Minimal ERC-1155 transfer seed data */
export function buildErc1155TransferSeed(overrides: Record<string, unknown> = {}) {
  return {
    ...buildTransferBase(overrides),
    tokenId: '1',
    amount: '10',
    ...overrides,
  }
}

/** @deprecated Use buildErc20TransferSeed instead */
export function buildTransferSeed(overrides: Record<string, unknown> = {}) {
  return buildErc20TransferSeed(overrides)
}

/** Minimal createClaimAction input — matches createClaimSchema shape */
export function buildCreateClaimActionInput(overrides: Record<string, unknown> = {}) {
  return {
    claimMessage: 'Test claim message for integration testing',
    tokenAddress: '0x' + '1'.repeat(40),
    counterpartyAddress: '0x' + '2'.repeat(40),
    isProverSender: true,
    tokenType: TokenType.ERC20,
    minTransfersSum: '0',
    maxTransfersSum: '0',
    minTransfersCount: 0,
    maxTransfersCount: 0,
    toDate: new Date(),
    chainId: 1,
    ...overrides,
  }
}

/** Minimal external transfer — matches externalTransferSchema in proofs.actions.ts */
export function buildExternalTransfer(overrides: Record<string, unknown> = {}) {
  return {
    from: '0x' + '3'.repeat(40),
    to: '0x' + '2'.repeat(40),
    contractAddress: '0x' + '1'.repeat(40),
    value: '1000000000000000000',
    timeStamp: '1700000000',
    hash: '0x' + randomUUID().replace(/-/g, '').padEnd(64, '0'),
    ...overrides,
  }
}

/** Minimal token seed data */
export function buildTokenSeed(overrides: Record<string, unknown> = {}) {
  return {
    address: '0x' + '1'.repeat(40),
    chainId: 1,
    name: 'Test Token',
    symbol: 'TST',
    decimals: 18,
    ...overrides,
  }
}

/** Minimal ENS cache seed data */
export function buildEnsCacheSeed(overrides: Record<string, unknown> = {}) {
  return {
    address: ('0x' + randomUUID().replace(/-/g, '').slice(0, 40)).toLowerCase(),
    name: `test-${randomUUID().slice(0, 8)}.eth`,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    resolvedAt: new Date(),
    ...overrides,
  }
}

/** Minimal verification seed data */
export function buildVerificationSeed(proofId: string, overrides: Record<string, unknown> = {}) {
  return {
    proofId,
    verifierNullifier: '0x' + randomUUID().replace(/-/g, '').padEnd(64, '0'),
    isValid: true,
    errorMessage: null,
    ...overrides,
  }
}
