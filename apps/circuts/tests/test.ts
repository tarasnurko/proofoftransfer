import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { readFile } from "node:fs/promises";

import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";

import {
  hashString,
  hashTransfer,
  poseidon2Hash,
  poseidon2HashStrings,
} from "../scripts/hashUtils";
import { generateZeroValues } from "../scripts/merkleUtils";
import { frToBigInt } from "../scripts/encodingUtils";
import { MERKLE_TREE_HEIGHT, MAX_TRANSFERS } from "../scripts/constants";
import {
  addressToBytes32,
  bigintToBytes32,
  generateAccount,
  generateEthereumAddress,
  generateRandomTransfers,
  generateTransfer,
  getClaimConstraintsFromTransfer,
  getClaimConstraintsFromTransfers,
  mergeAndShuffle,
  uuidToBytes32,
  generateTransfers,
  buildCircuitInputs,
  createEmptyMerkleProof,
} from "./testUtils";
import { EtherscanERC20Transfer } from "../types/index.types";
import { MerkleTree } from "../scripts/merkleTree";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const circuitPath = join(__dirname, "../target/circuts.json");

describe("Circuit tests", () => {
  let barretenbergApi: Barretenberg;
  let noir: Noir;
  let ultraHonkBackend: UltraHonkBackend;
  let merkleTreeZeroValues: Uint8Array[];
  let merkleTreeZeroValuesStrArr: string[];
  const prover = generateAccount();
  const proverAddress = prover.address;
  const proverAddressBytes32 = addressToBytes32(proverAddress);
  const userAddress = generateEthereumAddress();
  const userAddressBytes32 = addressToBytes32(userAddress);
  const tokenAddress = generateEthereumAddress();
  const tokenAddressBytes32 = addressToBytes32(tokenAddress);
  const claimId = randomUUID();
  const claimIdBytes32 = uuidToBytes32(claimId);
  const claimMessage = "Proof of transfering N tokens at X date";
  let claimMessageHashBytes32: `0x${string}`;

  let randomTransfers: EtherscanERC20Transfer[] = [];

  let poseidon2HashFn: (left: string, right: string) => Promise<string>;
  let hashTransferFn: (
    transfer: Pick<
      EtherscanERC20Transfer,
      "from" | "to" | "contractAddress" | "value" | "timeStamp"
    >
  ) => Promise<Uint8Array>;

  before(async () => {
    const circuitFile = await readFile(circuitPath, "utf-8");
    const circuit = JSON.parse(circuitFile);

    barretenbergApi = await Barretenberg.new({ threads: 1 });
    noir = new Noir(circuit);
    ultraHonkBackend = new UltraHonkBackend(circuit.bytecode, barretenbergApi);

    const zeroValueHash = await hashString(barretenbergApi, "proofoftransfer");
    const claimMessageHash = await hashString(barretenbergApi, claimMessage);
    claimMessageHashBytes32 = bigintToBytes32(frToBigInt(claimMessageHash));

    merkleTreeZeroValues = await generateZeroValues(
      zeroValueHash,
      MERKLE_TREE_HEIGHT,
      (left, right) => poseidon2Hash(barretenbergApi, left, right)
    );

    merkleTreeZeroValuesStrArr = merkleTreeZeroValues.map((fr) =>
      frToBigInt(fr).toString()
    );

    randomTransfers = generateRandomTransfers(10);

    poseidon2HashFn = async (left: string, right: string): Promise<string> => {
      return poseidon2HashStrings(barretenbergApi, left, right);
    };

    hashTransferFn = async (
      transfer: Pick<
        EtherscanERC20Transfer,
        "from" | "to" | "contractAddress" | "value" | "timeStamp"
      >
    ) => {
      return hashTransfer(barretenbergApi, transfer);
    };
  });

  describe("Valid proofs", () => {
    it("should verify proof of single transfer", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    const { witness } = await noir.execute(inputs);
    const proofData = await ultraHonkBackend.generateProof(witness);
    const isValid = await ultraHonkBackend.verifyProof({
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
    });

    assert.strictEqual(isValid, true, "Proof should be valid");
  });

  it("should verify proof of multiple transfers", async () => {
    const proverTransfers = generateTransfers(
      {
        from: proverAddress,
        to: userAddress,
        tokenAddress,
      },
      5
    );

    const constraints = getClaimConstraintsFromTransfers(proverTransfers);
    const allTransfers = mergeAndShuffle(randomTransfers, proverTransfers);

    const { inputs } = await buildCircuitInputs({
      proverTransfers,
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    const { witness } = await noir.execute(inputs);
    const proofData = await ultraHonkBackend.generateProof(witness);
    const isValid = await ultraHonkBackend.verifyProof({
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
    });

    assert.strictEqual(isValid, true, "Proof should be valid");
  });

  it("should verify proof with zero constraints (no restrictions)", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = {
      minTransfersSum: 0n,
      maxTransfersSum: 0n,
      fromBlockTimestamp: 0n,
      toBlockTimestamp: 0n,
    };
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    const { witness } = await noir.execute(inputs);
    const proofData = await ultraHonkBackend.generateProof(witness);
    const isValid = await ultraHonkBackend.verifyProof({
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
    });

    assert.strictEqual(isValid, true, "Proof should be valid");
  });

  it("should verify proof with maximum number of transfers (50)", async () => {
    const proverTransfers = generateTransfers(
      {
        from: proverAddress,
        to: userAddress,
        tokenAddress,
      },
      MAX_TRANSFERS
    );

    const constraints = getClaimConstraintsFromTransfers(proverTransfers);
    const allTransfers = mergeAndShuffle(randomTransfers, proverTransfers);

    const { inputs } = await buildCircuitInputs({
      proverTransfers,
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    const { witness } = await noir.execute(inputs);
    const proofData = await ultraHonkBackend.generateProof(witness);
    const isValid = await ultraHonkBackend.verifyProof({
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
    });

    assert.strictEqual(isValid, true, "Proof should be valid");
  });

  it("should verify proof with multiple valid transfers in large tree", async () => {
    const largeRandomTransfers = generateRandomTransfers(100);
    const proverTransfers = generateTransfers(
      {
        from: proverAddress,
        to: userAddress,
        tokenAddress,
      },
      5
    );

    const constraints = getClaimConstraintsFromTransfers(proverTransfers);
    const allTransfers = mergeAndShuffle(largeRandomTransfers, proverTransfers);

    const { inputs } = await buildCircuitInputs({
      proverTransfers,
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    const { witness } = await noir.execute(inputs);
    const proofData = await ultraHonkBackend.generateProof(witness);
    const isValid = await ultraHonkBackend.verifyProof({
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
    });

    assert.strictEqual(isValid, true, "Proof should be valid");
  });

  it("should verify proof with zero transfer amount and zero constraints", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });
    proverTransfer.value = "0";

    const constraints = {
      minTransfersSum: 0n,
      maxTransfersSum: 0n,
      fromBlockTimestamp: BigInt(proverTransfer.timeStamp),
      toBlockTimestamp: BigInt(proverTransfer.timeStamp),
    };
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    const { witness } = await noir.execute(inputs);
    const proofData = await ultraHonkBackend.generateProof(witness);
    const isValid = await ultraHonkBackend.verifyProof({
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
    });

    assert.strictEqual(isValid, true, "Should succeed with zero amount and zero constraints");
  });

  it("should produce same signature and nullifier for same inputs", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const result1 = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    const result2 = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    assert.strictEqual(
      result1.inputs.nullifier,
      result2.inputs.nullifier,
      "Same inputs should produce same nullifier"
    );
    assert.deepStrictEqual(
      result1.inputs.prover_signature,
      result2.inputs.prover_signature,
      "Same inputs should produce same signature"
    );
  });
});

describe("Nullifier & signature validation", () => {
  it("should fail with wrong nullifier", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
      nullifier: "12345",
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /Nullifier mismatch/
    );
  });

  it("should fail when signature is from wrong user", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const wrongProver = generateAccount();

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
      publicKey: wrongProver.publicKey,
    });

    await assert.rejects(async () => await noir.execute(inputs));
  });

  it("should fail with valid signature but tampered public inputs", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    inputs.min_transfers_sum = (constraints.minTransfersSum + 1000n).toString();

    await assert.rejects(async () => await noir.execute(inputs));
  });
});

describe("Transfer validation", () => {
  it("should fail when proving non-existent transfer", async () => {
    const fakeTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(fakeTransfer);
    const allTransfers = randomTransfers;

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [fakeTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
      transferProofs: [createEmptyMerkleProof(MERKLE_TREE_HEIGHT)],
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /merkle proof invalid/
    );
  });

  it("should fail when transfer has wrong token address", async () => {
    const wrongTokenAddress = generateEthereumAddress();
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress: wrongTokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /merkle proof invalid/
    );
  });

  it("should fail when transfer has wrong recipient", async () => {
    const wrongRecipient = generateEthereumAddress();
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: wrongRecipient,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /merkle proof invalid/
    );
  });

  it("should fail when transfer has wrong sender", async () => {
    const wrongSender = generateEthereumAddress();
    const proverTransfer = generateTransfer({
      from: wrongSender,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /merkle proof invalid/
    );
  });
});

describe("Constraint validation", () => {
  it("should fail when transfer sum below minimum", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const baseConstraints = getClaimConstraintsFromTransfer(proverTransfer);
    const constraints = {
      ...baseConstraints,
      minTransfersSum: baseConstraints.minTransfersSum + 1000n,
    };
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /Transfers sum .* is below required minimum/
    );
  });

  it("should fail when transfer sum exceeds maximum", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const baseConstraints = getClaimConstraintsFromTransfer(proverTransfer);
    const constraints = {
      ...baseConstraints,
      maxTransfersSum: baseConstraints.maxTransfersSum - 1000n,
    };
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /Transfers sum .* exceeds required maximum/
    );
  });

  it("should fail when transfer timestamp before minimum", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const baseConstraints = getClaimConstraintsFromTransfer(proverTransfer);
    const constraints = {
      ...baseConstraints,
      fromBlockTimestamp: baseConstraints.fromBlockTimestamp + 1000n,
    };
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /timestamp .* is before required minimum/
    );
  });

  it("should fail when transfer timestamp after maximum", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const baseConstraints = getClaimConstraintsFromTransfer(proverTransfer);
    const constraints = {
      ...baseConstraints,
      toBlockTimestamp: baseConstraints.toBlockTimestamp - 1000n,
    };
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    await assert.rejects(
      async () => await noir.execute(inputs),
      /timestamp .* is after required maximum/
    );
  });

  it("should fail when exceeding MAX_TRANSFERS", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    inputs.transfers_amount = (MAX_TRANSFERS + 1).toString();

    await assert.rejects(
      async () => await noir.execute(inputs),
      /Transfers amount .* exceeds MAX_TRANSFERS/
    );
  });

  it("should fail with transfers_amount = 0", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const constraints = getClaimConstraintsFromTransfer(proverTransfer);
    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);

    const { inputs } = await buildCircuitInputs({
      proverTransfers: [proverTransfer],
      constraints,
      allTransfers,
      prover,
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddress,
      userAddress,
      tokenAddressBytes32,
      userAddressBytes32,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn,
      hashTransferFn,
      barretenbergApi,
      merkleTreeHeight: MERKLE_TREE_HEIGHT,
      maxTransfers: MAX_TRANSFERS,
      MerkleTreeClass: MerkleTree,
    });

    inputs.transfers_amount = "0";

    await assert.rejects(
      async () => await noir.execute(inputs),
      /Transfers sum .* is below required minimum/
    );
  });
});
});
