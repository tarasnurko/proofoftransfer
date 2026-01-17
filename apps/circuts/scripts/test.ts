/**
 * Integration test for the Proof of Transfer circuit
 *
 * This test demonstrates the complete flow of generating and verifying a ZK proof that:
 * 1. A user has made specific token transfers (without revealing their address)
 * 2. The transfers match the specified constraints (token, recipient, amounts, dates)
 * 3. The proof includes a nullifier that prevents the same user from generating multiple proofs
 *
 * Key security features tested:
 * - Message format enforcement (prevents users from signing arbitrary messages)
 * - Signature verification (proves ownership of the sender address)
 * - Nullifier generation (deterministic, prevents proof reuse)
 * - Merkle tree verification (proves transfers are part of the public dataset)
 */

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

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked, toHex, hexToBytes } from "viem";

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

    // Generate a test account (in production, this would be the user's wallet)
    console.log("Generating test account...");
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const senderAddress = account.address;

    // Define test parameters for the proof
    // In production, these would come from the user/frontend
    const groupId =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const tokenAddress = "0x6be457e04092b28865e0cba84e3b2cfa0f871e67";
    const recipientAddress = "0x4838b106fce9647bdf1e7877bf73ce8b0bad5f97";
    const minTransferSum = 0n; // 0 = no constraint
    const maxTransferSum = 0n; // 0 = no constraint
    const fromBlockTimestamp = 0n; // 0 = no constraint
    const toBlockTimestamp = 0n; // 0 = no constraint

    // Create a test transfer that the user will prove they made
    const transfer = {
      amount: (105n * 10n ** 18n).toString(), // 105 tokens
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
    const transfersRootHash = tree.root();

    // Construct the message to sign by hashing all public parameters
    // This matches the reconstruct_message function in the circuit
    console.log("Constructing message to sign...");

    // Convert addresses and values to padded bytes32 format
    // Addresses are 20 bytes but we store them as Field (32 bytes) in the circuit
    const groupIdPadded = groupId.padStart(66, "0") as `0x${string}`;
    const tokenAddressPadded =
      `0x${tokenAddress.slice(2).padStart(64, "0")}` as `0x${string}`;
    const recipientAddressPadded =
      `0x${recipientAddress.slice(2).padStart(64, "0")}` as `0x${string}`;
    const transfersRootHashPadded =
      `0x${BigInt(transfersRootHash).toString(16).padStart(64, "0")}` as `0x${string}`;

    const messageBytes = encodePacked(
      [
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
        groupIdPadded,
        tokenAddressPadded,
        recipientAddressPadded,
        minTransferSum,
        maxTransferSum,
        fromBlockTimestamp,
        toBlockTimestamp,
        transfersRootHashPadded,
      ]
    );
    const hashedMessage = keccak256(messageBytes);

    // Sign the message hash
    // IMPORTANT: We sign the raw hash without Ethereum's "\x19Ethereum Signed Message" prefix
    // This ensures the signature is deterministic (RFC 6979):
    //   - Same private key + same message = same signature = same nullifier
    //   - This prevents users from generating multiple proofs for the same group
    console.log("Signing message...");
    const signature = await account.sign({ hash: hashedMessage });

    // Extract r and s from signature (remove 0x prefix and v byte)
    const signatureBytes = hexToBytes(signature);
    const r = Array.from(signatureBytes.slice(0, 32));
    const s = Array.from(signatureBytes.slice(32, 64));
    const v = signatureBytes[64];
    const fullSignature = [...r, ...s];

    // Compute nullifier from signature using Poseidon hash (matches circuit)
    console.log("Computing nullifier...");
    // Split signature into 8-byte chunks (8 chunks of 8 bytes = 64 bytes)
    const sigFields: Uint8Array[] = [];
    for (let i = 0; i < 8; i++) {
      let chunk = 0n;
      for (let j = 0; j < 8; j++) {
        chunk = chunk * 256n + BigInt(fullSignature[i * 8 + j]);
      }
      sigFields.push(bigIntToFr(chunk));
    }
    // Use api.poseidon2Hash with all 8 inputs
    const nullifierResult = await api.poseidon2Hash({
      inputs: sigFields,
    });
    const nullifier = frToBigInt(nullifierResult.hash).toString();

    // Extract public key from account
    // For ECDSA, we need to recover the public key from the signature
    // Viem doesn't directly expose the public key, so we'll use a workaround
    // The public key can be derived from the private key
    const publicKeyBytes = hexToBytes(account.publicKey);
    const pubKeyX = Array.from(publicKeyBytes.slice(1, 33)); // Skip the 0x04 prefix
    const pubKeyY = Array.from(publicKeyBytes.slice(33, 65));

    const emptyTransfer = { amount: "0", block_timestamp: "0" };
    const inputs = {
      group_id: groupId,
      token_address: tokenAddress,
      recipient_address: recipientAddress,
      min_transfer_sum: minTransferSum.toString(),
      max_transfer_sum: maxTransferSum.toString(),
      from_block_timestamp: fromBlockTimestamp.toString(),
      to_block_timestamp: toBlockTimestamp.toString(),
      transfers_root_hash: transfersRootHash,
      nullifier: nullifier,
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
      prover_pub_key_x: pubKeyX,
      prover_pub_key_y: pubKeyY,
      prover_signature: fullSignature,
      hashed_message: Array.from(hexToBytes(hashedMessage)),
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
