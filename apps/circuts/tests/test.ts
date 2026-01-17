import { describe, it, before } from "node:test";
import assert from "node:assert/strict";

import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { readFile } from "node:fs/promises";

import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { keccak256, encodePacked, hexToBytes } from "viem";

import {
  hashString,
  hashTransfer,
  poseidon2Hash,
  poseidon2HashStrings,
} from "../scripts/hashUtils";
import { generateZeroValues } from "../scripts/merkleUtils";
import { frToBigInt, bigIntToFr } from "../scripts/encodingUtils";
import { MERKLE_TREE_HEIGHT, MAX_TRANSFERS } from "../scripts/constants";
import {
  addressToBytes32,
  bigintToBytes32,
  generateAccount,
  generateEthereumAddress,
  generateRandomTransfers,
  generateTransfer,
  getClaimConstraintsFromTransfer,
  mergeAndShuffle,
  uuidToBytes32,
  padTransfersArray,
  padMerkleProofsArray,
  mapToCircuitTransfer,
} from "./testUtils";
import { EtherscanERC20Transfer } from "../types/index.types";
import { MerkleTree } from "../scripts/merkleTree";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const circuitPath = join(__dirname, "../target/circuts.json");

const add = (a: number, b: number) => a + b;

describe("Math operations", () => {
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

  it("should add two numbers correctly", () => {
    assert.strictEqual(add(2, 3), 5);
  });

  it("should fail if the sum is wrong", () => {
    assert.notStrictEqual(add(2, 2), 5);
  });

  it("should correctly generate and verify proof of 1 ERC20 transfer from prover to recipient", async () => {
    const proverTransfer = generateTransfer({
      from: proverAddress,
      to: userAddress,
      tokenAddress,
    });

    const claimConstraints = getClaimConstraintsFromTransfer(proverTransfer);

    const allTransfers = mergeAndShuffle(randomTransfers, [proverTransfer]);
    const allTransfersHashes = await Promise.all(
      allTransfers.map(hashTransferFn)
    );
    const allTransfersHashesStrArr = allTransfersHashes.map((item) =>
      frToBigInt(item).toString()
    );

    const merkleTree = new MerkleTree(
      MERKLE_TREE_HEIGHT,
      merkleTreeZeroValuesStrArr,
      poseidon2HashFn
    );

    await merkleTree.init(allTransfersHashesStrArr);

    const proverTransferIndex = allTransfers
      .map((transfer, index) => ({ transfer, index }))
      .filter((item) => item.transfer.blockHash === proverTransfer.blockHash)
      .map((item) => item.index)[0];

    const proverTransferProof = merkleTree.proof(proverTransferIndex);
    const merkleTreeRoot = merkleTree.root();
    const merkleTreeRootBytes32 = bigintToBytes32(merkleTreeRoot);

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
      ]
    );

    const hashedMessage = keccak256(messageBytes);

    const signature = await prover.sign({ hash: hashedMessage });

    const signatureBytes = hexToBytes(signature);
    const r = Array.from(signatureBytes.slice(0, 32));
    const s = Array.from(signatureBytes.slice(32, 64));
    const fullSignature = [...r, ...s];

    const sigFields: Uint8Array[] = [];
    for (let i = 0; i < 8; i++) {
      let chunk = 0n;
      for (let j = 0; j < 8; j++) {
        chunk = chunk * 256n + BigInt(fullSignature[i * 8 + j]);
      }
      sigFields.push(bigIntToFr(chunk));
    }
    const nullifierResult = await barretenbergApi.poseidon2Hash({
      inputs: sigFields,
    });
    const nullifier = frToBigInt(nullifierResult.hash).toString();

    const publicKeyBytes = hexToBytes(prover.publicKey);
    const pubKeyX = Array.from(publicKeyBytes.slice(1, 33));
    const pubKeyY = Array.from(publicKeyBytes.slice(33, 65));

    const circuitTransfers = [mapToCircuitTransfer(proverTransfer)];
    const circuitTransfersProofs = [proverTransferProof];

    const paddedTransfers = padTransfersArray(circuitTransfers, MAX_TRANSFERS);
    const paddedProofs = padMerkleProofsArray(
      circuitTransfersProofs,
      MAX_TRANSFERS,
      MERKLE_TREE_HEIGHT
    );

    const inputs = {
      claim_id: claimIdBytes32,
      claim_message_hash: claimMessageHashBytes32,
      token_address: tokenAddress,
      recipient_address: userAddress,
      min_transfers_sum: claimConstraints.minTransfersSum.toString(),
      max_transfers_sum: claimConstraints.maxTransfersSum.toString(),
      from_block_timestamp: claimConstraints.fromBlockTimestamp.toString(),
      to_block_timestamp: claimConstraints.toBlockTimestamp.toString(),
      transfers_root_hash: merkleTreeRoot,
      nullifier: nullifier,
      transfers: paddedTransfers,
      transfers_proofs: paddedProofs.map((p) => p.pathElements),
      are_transfer_leaves_even: paddedProofs.map((p) =>
        p.pathIndices.map((idx) => idx === 0)
      ),
      transfers_amount: circuitTransfers.length.toString(),
      prover_pub_key_x: pubKeyX,
      prover_pub_key_y: pubKeyY,
      prover_signature: fullSignature,
    };

    const { witness } = await noir.execute(inputs);

    const proofData = await ultraHonkBackend.generateProof(witness);

    const isValid = await ultraHonkBackend.verifyProof({
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
    });

    assert.strictEqual(isValid, true, "Proof should be valid");
  });
});
