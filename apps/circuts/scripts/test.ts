import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { MerkleTree } from "./merkleTree.js";
import {
  poseidon2Hash,
  hashTransfer,
  poseidon2HashStrings,
  hashString,
} from "./hashUtils.js";
import { bigIntToFr, frToBigInt } from "./encodingUtils.js";
import { ZERO_VALUES, MERKLE_TREE_HEIGHT, MAX_TRANSFERS } from "./constants.js";
import { generateZeroValues } from "./merkleUtils.js";

async function runTest() {
  try {
    const circuitPath = resolve(process.cwd(), "target/circuts.json");
    const circuitFile = await readFile(circuitPath, "utf-8");
    const circuit = JSON.parse(circuitFile);

    console.log("Initializing...");
    const api = await Barretenberg.new({ threads: 1 });
    const noir = new Noir(circuit);
    const backend = new UltraHonkBackend(circuit.bytecode, api);

    // Generate zero values dynamically
    console.log("Generating zero values...");
    const initialZeroValue = await hashString(api, "proofoftransfer");
    const zeroValuesFr = await generateZeroValues(
      initialZeroValue,
      MERKLE_TREE_HEIGHT,
      (left, right) => poseidon2Hash(api, left, right)
    );
    const zeroValues = zeroValuesFr.map((fr) => frToBigInt(fr).toString());

    // Wrapper for MerkleTree: converts string -> Uint8Array -> hash -> string
    const poseidon2HashFn = async (
      left: string,
      right: string
    ): Promise<string> => {
      return poseidon2HashStrings(api, left, right);
    };

    const senderAddress = "0x388c818ca8b9251b393131c08a736a67ccb19297";
    const tokenAddress = "0x6be457e04092b28865e0cba84e3b2cfa0f871e67";
    const recipientAddress = "0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97";
    const transfer = {
      amount: (105n ** 18n).toString(),
      block_timestamp: "1500000",
    };

    const transferHashFr = await hashTransfer(
      api,
      senderAddress,
      recipientAddress,
      tokenAddress,
      transfer.amount,
      transfer.block_timestamp
    );
    const transferHashStr = frToBigInt(transferHashFr).toString();

    const tree = new MerkleTree(
      MERKLE_TREE_HEIGHT,
      zeroValues,
      poseidon2HashFn
    );
    await tree.init([transferHashStr]);
    const proof = tree.proof(0);

    const emptyTransfer = { amount: "0", block_timestamp: "0" };
    const inputs = {
      sender_address: senderAddress,
      token_address: tokenAddress,
      recipient_address: recipientAddress,
      min_transfer_sum: "0",
      max_transfer_sum: "0",
      from_block_timestamp: "0",
      to_block_timestamp: "0",
      transfers_root_hash: tree.root(),
      transfers: [transfer, ...Array(MAX_TRANSFERS - 1).fill(emptyTransfer)],
      transfers_proofs: [
        proof.pathElements,
        ...Array(MAX_TRANSFERS - 1).fill(Array(MERKLE_TREE_HEIGHT).fill("0")),
      ],
      are_transfer_leaves_even: [
        proof.pathIndices.map((idx) => idx === 0),
        ...Array(MAX_TRANSFERS - 1).fill(Array(MERKLE_TREE_HEIGHT).fill(false)),
      ],
      transfers_amount: "1",
    };

    console.log("Generating witness...");
    const { witness } = await noir.execute(inputs);

    console.log("Generating proof...");
    const proofData = await backend.generateProof(witness);

    console.log("Verifying proof...");
    const isValid = await backend.verifyProof({
      proof: proofData.proof,
      publicInputs: proofData.publicInputs,
    });

    console.log(isValid ? "✅ Test PASSED" : "❌ Test FAILED");

    await api.destroy();
    process.exit(isValid ? 0 : 1);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

runTest();
