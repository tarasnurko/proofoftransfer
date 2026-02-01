import { keccak256, encodePacked, hexToBytes } from "viem";
import type { Barretenberg } from "@aztec/bb.js";
import type { EtherscanERC20Transfer } from "@repo/types";

import type { MerkleProof, CircuitTransfer, ClaimConstraints } from "./types.js";
import { bigintToField, fieldToBigint } from "./encoding.js";

export const uuidToBytes32 = (uuid: string): `0x${string}` => {
  const formattedClaimId = `${uuid.replace(/-/g, "")}`;
  return `0x${formattedClaimId.padStart(64, "0")}`;
};

export const addressToBytes32 = (address: string): `0x${string}` => {
  return `0x${address.slice(2).padStart(64, "0")}`;
};

export const bigintToBytes32 = (value: string | bigint): `0x${string}` => {
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
};

export const createEmptyTransfer = (): CircuitTransfer => ({
  amount: "0",
  block_timestamp: "0",
});

export const mapToCircuitTransfer = (
  transfer: EtherscanERC20Transfer,
): CircuitTransfer => ({
  amount: transfer.value,
  block_timestamp: transfer.timeStamp,
});

export const mapToCircuitTransfers = (
  transfers: EtherscanERC20Transfer[],
): CircuitTransfer[] => transfers.map(mapToCircuitTransfer);

export const createEmptyMerkleProof = (treeHeight: number): MerkleProof => ({
  root: "0",
  pathElements: Array(treeHeight).fill("0"),
  pathIndices: Array(treeHeight).fill(0),
  leaf: "0",
});

export const padTransfersArray = (
  transfers: CircuitTransfer[],
  maxLength: number,
): CircuitTransfer[] => {
  if (transfers.length >= maxLength) {
    return transfers.slice(0, maxLength);
  }
  return [
    ...transfers,
    ...Array(maxLength - transfers.length)
      .fill(null)
      .map(() => createEmptyTransfer()),
  ];
};

export const padMerkleProofsArray = (
  proofs: MerkleProof[],
  maxLength: number,
  treeHeight: number,
): MerkleProof[] => {
  if (proofs.length >= maxLength) {
    return proofs.slice(0, maxLength);
  }
  return [
    ...proofs,
    ...Array(maxLength - proofs.length)
      .fill(null)
      .map(() => createEmptyMerkleProof(treeHeight)),
  ];
};

export const constructClaimMessage = (params: {
  claimIdBytes32: `0x${string}`;
  claimMessageHashBytes32: `0x${string}`;
  tokenAddressBytes32: `0x${string}`;
  userAddressBytes32: `0x${string}`;
  claimConstraints: ClaimConstraints;
  merkleTreeRootBytes32: `0x${string}`;
}): `0x${string}` => {
  const {
    claimIdBytes32,
    claimMessageHashBytes32,
    tokenAddressBytes32,
    userAddressBytes32,
    claimConstraints,
    merkleTreeRootBytes32,
  } = params;

  const messageBytes = encodePacked(
    [
      "bytes32",
      "bytes32",
      "bytes32",
      "bytes32",
      "uint128",
      "uint128",
      "uint64",
      "uint64",
      "bytes32",
    ],
    [
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddressBytes32,
      userAddressBytes32,
      claimConstraints.minTransfersSum,
      claimConstraints.maxTransfersSum,
      claimConstraints.fromBlockTimestamp,
      claimConstraints.toBlockTimestamp,
      merkleTreeRootBytes32,
    ],
  );

  return keccak256(messageBytes);
};

export const processSignature = async (
  signature: `0x${string}`,
  barretenbergApi: Barretenberg,
): Promise<{
  fullSignature: number[];
  nullifier: string;
}> => {
  const signatureBytes = hexToBytes(signature);
  const r = Array.from(signatureBytes.slice(0, 32));
  const s = Array.from(signatureBytes.slice(32, 64));
  const fullSignature = [...r, ...s];

  const sigFields: Uint8Array[] = [];
  for (let i = 0; i < 8; i++) {
    let chunk = 0n;
    for (let j = 0; j < 8; j++) {
      chunk = chunk * 256n + BigInt(fullSignature[i * 8 + j]!);
    }
    sigFields.push(bigintToField(chunk));
  }

  const nullifierResult = await barretenbergApi.poseidon2Hash({
    inputs: sigFields,
  });
  const nullifier = fieldToBigint(nullifierResult.hash).toString();

  return { fullSignature, nullifier };
};

export const extractPublicKeyComponents = (
  publicKey: `0x${string}`,
): {
  pubKeyX: number[];
  pubKeyY: number[];
} => {
  const publicKeyBytes = hexToBytes(publicKey);
  const pubKeyX = Array.from(publicKeyBytes.slice(1, 33));
  const pubKeyY = Array.from(publicKeyBytes.slice(33, 65));

  return { pubKeyX, pubKeyY };
};
