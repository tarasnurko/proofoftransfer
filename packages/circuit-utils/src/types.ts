// Merkle tree types
export interface MerkleProof {
  root: string;
  pathElements: string[];
  pathIndices: number[];
  leaf: string;
}

export type HashFn = (left: string, right: string) => Promise<string>;
export type HashFnField = (
  left: Uint8Array,
  right: Uint8Array,
) => Promise<Uint8Array>;

// Circuit input types
export interface CircuitTransfer {
  amount: string;
  block_timestamp: string;
}

export interface ClaimConstraints {
  minTransfersSum: bigint;
  maxTransfersSum: bigint;
  fromBlockTimestamp: bigint;
  toBlockTimestamp: bigint;
}
