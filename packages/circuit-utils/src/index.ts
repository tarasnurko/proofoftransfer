// Types
export type {
  MerkleProof,
  HashFn,
  HashFnField,
  CircuitTransfer,
  ClaimConstraints,
} from "./types.js";

// Encoding utilities
export { bigintToField, fieldToBigint, stringToField } from "./encoding.js";

// Merkle tree
export {
  MerkleTree,
  generateZeroValues,
  generateZeroValuesField,
} from "./merkle.js";

// Hash utilities
export {
  hashString,
  poseidon2HashLeftRight,
  poseidon2HashStringsLeftRight,
  hashTransfer,
  computeNullifier,
} from "./hash.js";

// Constants
export { ZERO_VALUES, MERKLE_TREE_HEIGHT, MAX_TRANSFERS } from "./constants.js";

// Circuit utilities
export { proveAndVerify } from "./circuit.js";

// Utils
export {
  uuidToBytes32,
  addressToBytes32,
  bigintToBytes32,
  createEmptyTransfer,
  mapToCircuitTransfer,
  mapToCircuitTransfers,
  createEmptyMerkleProof,
  padTransfersArray,
  padMerkleProofsArray,
  constructClaimMessage,
  processSignature,
  extractPublicKeyComponents,
} from "./utils.js";
