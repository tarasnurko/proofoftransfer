# Technical Overview

## Table of Contents

1. [System Overview](#system-overview)
2. [Identity Model — Nullifiers](#identity-model--nullifiers)
3. [Claim Creation and Merkle Trees](#claim-creation-and-merkle-trees)
4. [EIP-712 Signing](#eip-712-signing)
5. [ZK Proof Generation](#zk-proof-generation)
6. [Verification Flow](#verification-flow)
7. [Trust Model and Security Properties](#trust-model-and-security-properties)
8. [Data Model](#data-model)
9. [Architecture](#architecture)

---

## System Overview

Proof of Transfer is a zero-knowledge proof system for ERC-20 token transfers. It allows a prover to demonstrate they made transfers matching specific constraints (token, recipient, amount range, time range) without revealing which wallet address is theirs.

<!-- DIAGRAM: High-level system diagram with three actors (Claim Creator, Prover, Verifier). Claim Creator creates claim with constraints. Prover generates ZK proof using their transfers + claim data. Verifier independently fetches transfers, rebuilds merkle tree, verifies ZK proof. App/server in the middle stores claims and proofs but NOT wallet addresses. -->

### Key Properties

- **Privacy**: No wallet addresses are stored. Identity is represented by nullifiers.
- **Trustless verification**: Verifiers bring their own transfer data instead of trusting the app's database.
- **Non-interactive**: Once a proof is generated, anyone can verify it independently.
- **Sybil-resistant**: Each wallet produces a deterministic nullifier per claim, preventing duplicate proofs/verifications.

---

## Identity Model — Nullifiers

The system never stores wallet addresses. Instead, identity is based on **nullifiers** — deterministic anonymous identifiers.

### How Nullifiers Work

```
Wallet + Claim Data → EIP-712 Signature → Nullifier
```

1. The user signs an EIP-712 typed data message containing the claim parameters
2. The signature is deterministic — same wallet + same claim data = same signature every time
3. The signature is hashed to produce a **nullifier**
4. The nullifier uniquely identifies this wallet for this specific claim

### Properties

| Property | Explanation |
|----------|-------------|
| **Deterministic** | Same wallet + same claim always produces the same nullifier |
| **Unlinkable** | Different claims produce different nullifiers for the same wallet |
| **Anonymous** | The nullifier reveals nothing about the wallet address |
| **Collision-resistant** | Two different wallets cannot produce the same nullifier for the same claim |

### Why Not Addresses?

Storing addresses would link proofs to wallets, defeating the privacy goal. With nullifiers:

- The prover's nullifier is stored with the proof (to prevent duplicates)
- The verifier's nullifier is stored with the verification (to prevent re-verification and self-verification)
- Neither reveals who the actual wallet owner is

<!-- DIAGRAM: Two wallets (A, B) signing same claim data. Each produces different signature → different nullifier. Wallet A → Sig A → Nullifier A, Wallet B → Sig B → Nullifier B. Note: "Same wallet + different claim → different nullifier". -->

---

## Claim Creation and Merkle Trees

### What a Claim Contains

A claim defines constraints for token transfers:

| Field | Description |
|-------|-------------|
| `message` | Human-readable description of the claim |
| `chainId` | Blockchain network (Base, Ethereum, BSC, etc.) |
| `tokenAddress` | ERC-20 token contract address |
| `recipientAddress` | Address that received the transfers |
| `minTransfersSum` | Minimum total transfer amount (optional) |
| `maxTransfersSum` | Maximum total transfer amount (optional) |
| `fromBlockTimestamp` | Earliest transfer timestamp (optional) |
| `toBlockTimestamp` | Latest transfer timestamp (optional) |

### Claim Creation Process

```
1. Fetch transfers from blockchain (Etherscan API)
2. Filter by constraints (token, recipient, amount, time)
3. Store transfers in DB
4. Sort transfers by blockTimestamp
5. Hash each transfer using Poseidon hash
6. Build Poseidon merkle tree from hashes
7. Store merkle root in claim
```

### Transfer Hashing

Each transfer is hashed using the Poseidon hash function (ZK-friendly):

```
hash = poseidon(from, to, contractAddress, value, timeStamp)
```

This produces a unique fingerprint for each transfer that can be used inside ZK circuits.

### Merkle Tree Construction

<!-- DIAGRAM: Binary merkle tree. Leaves: Hash(Transfer 0..3) sorted by timestamp. Internal nodes: poseidon2(left, right). Root labeled "Merkle Root (stored in claim)". -->

The merkle tree is built from transfer hashes using Poseidon2 for internal nodes:

- **Height**: Fixed (configurable via `MERKLE_TREE_HEIGHT`)
- **Leaf ordering**: Transfers sorted by `blockTimestamp` ascending — leaf index 0 is the earliest transfer
- **Empty leaves**: Filled with predefined zero values
- **Hash function**: `poseidon2(left, right)` for internal nodes

The merkle root is stored in the claim. This root is the canonical representation of all transfers in the claim.

### Why Transfer Ordering Matters

The merkle tree is deterministic only if transfers are in the same order. The system uses `blockTimestamp` as the sort key. This means:

- During claim creation: transfers sorted by timestamp
- During proof generation: same sort order reproduces same tree
- During verification: verifier's transfers must also be sorted by timestamp to get the same root

---

## EIP-712 Signing

### What Gets Signed

Both provers and verifiers sign the same EIP-712 typed data structure:

```
domain: {
  name: "ProofOfTransfer"
  version: "1"
  chainId: <wallet's chain ID>
  verifyingContract: 0x0000000000000000000000000000000000000000
}

types: {
  Claim: [
    { claimId:             bytes32 }
    { claimMessageHash:    bytes32 }
    { tokenAddress:        address }
    { recipientAddress:    address }
    { minTransfersSum:     uint128 }
    { maxTransfersSum:     uint128 }
    { fromBlockTimestamp:  uint64  }
    { toBlockTimestamp:    uint64  }
    { transfersRootHash:   bytes32 }
  ]
}
```

The `transfersRootHash` field contains the merkle root computed from the claim's transfers.

### Why EIP-712?

- **Deterministic**: Same data + same wallet = same signature every time
- **Human-readable**: Wallet shows structured data to the user, not opaque hex
- **Standard**: Widely supported by all wallets
- **Free**: Signing is off-chain, costs no gas

### Signature Processing

```
Signature → processSignature() → { nullifier, fullSignature }
```

The signature is processed server-side to derive:
1. **Nullifier** — hash of the signature, used as anonymous identity
2. **Full signature** — the complete signature data needed for the ZK circuit (prover only)

---

## ZK Proof Generation

### Two-Phase Process

Proof generation happens in two phases to separate the signing step (requires wallet interaction) from the compute-heavy proof generation.

<!-- DIAGRAM: Sequence diagram. Phase 1 (Sign): Client → Server: prepareClaimSigningDataAction → Server builds merkle tree, returns EIP-712 + circuit data → Client signs → Server returns nullifier. Phase 2 (Generate): Client runs ZK circuit locally → submits proof + nullifier → Server stores. -->

#### Phase 1: Sign Claim

1. **Server prepares data** (`prepareClaimSigningDataAction`):
   - Fetches all transfers for the claim
   - Builds the full merkle tree
   - Finds the prover's transfers (by sender address)
   - Computes merkle proofs for each of the prover's transfers
   - Validates constraints (amount sum in range, timestamps in range)
   - Returns: EIP-712 signing data + circuit inputs (merkle proofs, padded transfers)

2. **Client signs**:
   - Prompts wallet to sign EIP-712 typed data
   - Sends signature to server

3. **Server processes signature** (`processSignatureAction`):
   - Derives nullifier from signature
   - Returns nullifier + signature components

4. **Client assembles circuit inputs**:
   - Combines server data + signature data + public key
   - Stores prepared proof data in state

#### Phase 2: Generate Proof

1. **Client generates ZK proof locally** (in-browser):
   - Loads the Noir circuit
   - Runs the UltraHonk prover
   - Takes ~10-30 seconds
   - Produces: proof bytes + public inputs

2. **Client submits** (`submitProofAction`):
   - Sends proof data + nullifier to server
   - Server checks nullifier uniqueness per claim
   - Stores proof

### Circuit Inputs

The ZK circuit receives:

| Input | Description |
|-------|-------------|
| `claim_id` | Claim identifier (bytes32) |
| `claim_message_hash` | Poseidon hash of claim message |
| `token_address` | Token contract address |
| `recipient_address` | Recipient address |
| `chain_id` | Blockchain chain ID |
| `min_transfers_sum` | Minimum amount constraint |
| `max_transfers_sum` | Maximum amount constraint |
| `from_block_timestamp` | Start time constraint |
| `to_block_timestamp` | End time constraint |
| `transfers_root_hash` | Merkle root of all claim transfers |
| `nullifier` | Prover's anonymous identifier |
| `transfers` | Prover's transfers (padded array) |
| `transfers_proofs` | Merkle proofs for each transfer |
| `are_transfer_leaves_even` | Merkle proof path directions |
| `transfers_amount` | Number of real transfers (non-padding) |
| `prover_pub_key_x/y` | Prover's public key components |
| `prover_signature` | Full EIP-712 signature |

### What the Circuit Proves

The Noir circuit proves all of the following in zero-knowledge:

1. **Transfer inclusion**: Each of the prover's transfers is in the merkle tree (valid merkle proof)
2. **Constraint satisfaction**: The sum of transfer amounts is within `[minTransfersSum, maxTransfersSum]`
3. **Time range**: All transfers are within `[fromBlockTimestamp, toBlockTimestamp]`
4. **Signature validity**: The prover actually signed the EIP-712 message (owns the private key)
5. **Nullifier correctness**: The nullifier is correctly derived from the signature

Without revealing which specific transfers belong to the prover.

---

## Verification Flow

### Overview

Verification is designed to be **trustless** — the verifier does not need to trust the application's database.

<!-- DIAGRAM: Verification flow. Left: Verifier fetches transfers independently (API or CSV). Middle: Server sorts → hashes → builds merkle tree → compares root → verifies ZK proof. Right: Result (valid/invalid) stored with verifier nullifier. -->

### Why Verifiers Provide Their Own Transfers

This is the core trust model. The verification proves two things:

1. **Data integrity**: The verifier independently fetches transfers from the blockchain. If their transfers produce the same merkle root as the claim, it confirms the claim's transfer data is authentic and hasn't been tampered with.

2. **Proof validity**: The ZK proof is then verified against the confirmed merkle root, proving the prover's constraints were satisfied.

If the app were to fabricate or modify transfers, the verifier's independently-fetched data would produce a different merkle root, and verification would fail.

### Step-by-Step Server Logic

```
1. Receive: proofId, verifierNullifier, verifierTransfers[]

2. Fetch proof (includes claim data)

3. Check: verifierNullifier !== proof.nullifier
   → If equal: REJECT "Cannot verify your own proof"

4. Check: no existing successful verification for this nullifier+proof
   → If exists: REJECT "Already verified"

5. Sort verifierTransfers by timeStamp ascending

6. Hash each transfer: poseidon(from, to, contractAddress, value, timeStamp)

7. Build merkle tree from hashes

8. Compare computed root with claim.merkleRoot
   → If mismatch: FAIL "Root mismatch"

9. Load ZK circuit

10. Verify proof: UltraHonkBackend.verifyProof(proofData, publicInputs)
    → If invalid: FAIL "ZK proof invalid"

11. Record verification result with verifierNullifier

12. Return: { isValid: true/false, error?: string }
```

### Transfer Sources for Verification

Verifiers can get transfers from two sources:

#### Blockchain API Fetch
The app queries the same Etherscan API used during claim creation. This is convenient but still relies on Etherscan's API.

#### CSV Upload (More Trustless)
The verifier downloads transfer data directly from the block explorer website (Etherscan, BaseScan, etc.) as a CSV file. This is more trustless because:

- The verifier sees the data on the explorer's website
- The CSV comes from the explorer, not from the app
- Multiple CSVs can be combined (up to 3 files)

The CSV is parsed client-side with support for:
- Quoted values
- Human-readable amounts (converted to raw token units using token decimals)
- Multiple column name formats (TransactionHash/TxHash/Hash, etc.)

### Verification Rules

| Rule | Enforcement |
|------|-------------|
| Cannot verify your own proof | `verifierNullifier !== proof.nullifier` |
| One success per verifier per proof | Check for existing successful verification |
| Retry on failure | Failed records deleted before new attempt |
| Transfer ordering | Server sorts by timestamp before hashing |

---

## Trust Model and Security Properties

### What You Trust

| Component | Trust Level | Why |
|-----------|-------------|-----|
| Blockchain data | High | Immutable, publicly verifiable |
| ZK proof math | High | Cryptographic guarantee, deterministic |
| Poseidon hash | High | Widely audited ZK-friendly hash |
| Block explorer (Etherscan) | Medium | Centralized but reputable data source |
| This application | Low | Only stores claims/proofs, verification is trustless |

### What the Prover Can't Fake

- Having transfers they don't have (merkle proof would fail)
- Satisfying constraints they don't meet (circuit would fail)
- Using someone else's wallet (signature verification in circuit)

### What the App Can't Fake

- Transfer data (verifier independently fetches and compares)
- Proof validity (ZK verification is deterministic math)
- Identity (nullifiers derived from wallet signatures)

### What a Verifier Confirms

By successfully verifying a proof, the verifier confirms:

1. The transfer data in the claim matches what's on the blockchain
2. The prover has a valid wallet that made matching transfers
3. The prover's transfers satisfy all claim constraints
4. The proof was generated correctly

---

## Data Model

### Database Schema

<!-- DIAGRAM: ER diagram. 4 tables: claims → proofs (1:N via claimId) → proof_verifications (1:N via proofId). transfers standalone (queried by claim constraints at runtime, no FK). -->

#### `claims`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| message | text | Human-readable claim description |
| messageHash | varchar(78) | Poseidon hash of message |
| tokenAddress | varchar(42) | ERC-20 token contract |
| recipientAddress | varchar(42) | Transfer recipient |
| minTransfersSum | varchar(78) | Min amount constraint (uint256 as string) |
| maxTransfersSum | varchar(78) | Max amount constraint (uint256 as string) |
| fromBlockTimestamp | bigint | Start time constraint |
| toBlockTimestamp | bigint | End time constraint |
| chainId | integer | Blockchain network ID |
| merkleRoot | varchar(78) | Merkle root of claim's transfers |

#### `proofs`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| claimId | uuid | FK to claims |
| nullifier | varchar(78) | Prover's anonymous identifier |
| proofData | text | ZK proof bytes (hex) |
| publicInputs | jsonb | Circuit public inputs |

No wallet addresses stored. The nullifier is the only identity.

#### `proof_verifications`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| proofId | uuid | FK to proofs |
| verifierNullifier | varchar(78) | Verifier's anonymous identifier |
| isValid | boolean | Verification result |
| errorMessage | text | Error details (if failed) |

#### `transfers`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| chainId | integer | Blockchain network |
| txHash | varchar(66) | Transaction hash |
| blockNumber | bigint | Block number |
| blockTimestamp | bigint | Block timestamp |
| senderAddress | varchar(42) | Transfer sender |
| recipientAddress | varchar(42) | Transfer recipient |
| tokenAddress | varchar(42) | Token contract |
| amount | varchar(78) | Transfer amount (uint256 as string) |

Transfers are not linked to claims via a join table. Instead, they are queried at runtime by matching the claim's constraints (chainId, tokenAddress, recipientAddress, fromBlockTimestamp, toBlockTimestamp) and sorted by `blockTimestamp`. This works because transfers are immutable on-chain — the same query always returns the same results.

### Why varchar(78) for Amounts?

ERC-20 token amounts can be up to `uint256` (2^256 - 1), which is a 78-digit decimal number. PostgreSQL `bigint` maxes out at ~19 digits. `varchar(78)` stores the full precision.

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React, Tailwind CSS |
| Wallet | wagmi + @reown/appkit |
| ZK Circuit | Noir (Aztec), compiled to UltraHonk |
| ZK Runtime | @aztec/bb.js (Barretenberg) |
| Database | PostgreSQL + Drizzle ORM |
| Server Actions | next-safe-action with Zod validation |
| Blockchain Data | Etherscan API (multi-chain) |

### Client-Server Split

| Operation | Where | Why |
|-----------|-------|-----|
| EIP-712 signing | Client | Requires wallet private key |
| ZK proof generation | Client | Privacy — server never sees prover's transfers mapped to their address |
| Merkle tree building | Server | Needs access to all transfers in DB |
| Signature → Nullifier | Server | Uses Barretenberg (heavy WASM), consistent hashing |
| ZK proof verification | Server | Deterministic, authoritative result |
| Transfer fetching (Etherscan) | Server | API key management, rate limiting |

### Why Proof Generation is Client-Side

The ZK proof is generated in the user's browser, not on the server. This is critical for privacy:

- The server provides the full merkle tree and circuit data
- The client knows which transfers are theirs (by sender address)
- The circuit proves ownership without revealing the specific transfers to anyone
- If proof generation were server-side, the server would learn which transfers belong to the prover

### Data Flow

<!-- DIAGRAM: Full data flow with 3 phases. Phase 1 (Claim Creation): form → Etherscan fetch → store transfers → build merkle tree → store claim with root. Phase 2 (Proof Generation): server sends tree data to client → client signs EIP-712 → server derives nullifier → client generates ZK proof in browser → submits. Phase 3 (Verification): verifier fetches transfers independently → server sorts, hashes, builds tree → compares root → verifies ZK proof → stores result. -->
