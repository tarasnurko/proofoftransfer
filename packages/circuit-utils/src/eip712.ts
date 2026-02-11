import type { Address } from "viem";
import { zeroAddress } from "viem";

export interface Eip712Domain {
  name: "ProofOfTransfer";
  version: "1";
  chainId: bigint;
  verifyingContract: Address;
}

export interface ClaimEip712Message {
  claimId: Address;
  claimMessageHash: Address;
  tokenAddress: Address;
  recipientAddress: Address;
  minTransfersSum: bigint;
  maxTransfersSum: bigint;
  fromBlockTimestamp: bigint;
  toBlockTimestamp: bigint;
  transfersRootHash: Address;
}

export const EIP712_CLAIM_TYPES = {
  Claim: [
    { name: "claimId", type: "bytes32" },
    { name: "claimMessageHash", type: "bytes32" },
    { name: "tokenAddress", type: "address" },
    { name: "recipientAddress", type: "address" },
    { name: "minTransfersSum", type: "uint128" },
    { name: "maxTransfersSum", type: "uint128" },
    { name: "fromBlockTimestamp", type: "uint64" },
    { name: "toBlockTimestamp", type: "uint64" },
    { name: "transfersRootHash", type: "bytes32" },
  ],
} as const;

export function buildEip712Domain(
  chainId: number | bigint,
): Eip712Domain {
  return {
    name: "ProofOfTransfer",
    version: "1",
    chainId: BigInt(chainId),
    verifyingContract: zeroAddress,
  };
}
