# Proof of Transfer - App Flow

## Overview

ZK-proof system for proving token transfers without revealing sender address.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PROOF OF TRANSFER                          │
│         Prove transfers privately using zero-knowledge proofs       │
└─────────────────────────────────────────────────────────────────────┘
```

## System Components

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  Etherscan   │
│    (Web)     │◀────│   (API)      │◀────│     API      │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │   Database   │
       │             └──────────────┘
       │
       ▼
┌──────────────┐
│  ZK Circuit  │
│   (Noir)     │
└──────────────┘
```

## Core Entities

### Claim

Public group of constraints that define which transfers are valid for proving.

| Field                  | Description                     |
| ---------------------- | ------------------------------- |
| `claim_id`             | Unique identifier               |
| `claim_message_hash`   | Poseidon2 hash of claim message |
| `token_address`        | ERC20 token contract            |
| `recipient_address`    | Transfer recipient              |
| `min_transfers_sum`    | Min sum constraint (0 = none)   |
| `max_transfers_sum`    | Max sum constraint (0 = none)   |
| `from_block_timestamp` | Earliest timestamp (0 = none)   |
| `to_block_timestamp`   | Latest timestamp (0 = none)     |
| `transfers_root_hash`  | Merkle root of valid transfers  |

### Transfer

On-chain token transfer that matches claim constraints.

| Field               | Description            |
| ------------------- | ---------------------- |
| `sender_address`    | Who sent tokens        |
| `recipient_address` | Who received tokens    |
| `token_address`     | Token contract         |
| `amount`            | Transfer amount        |
| `block_timestamp`   | When transfer occurred |

### Proof

ZK proof that user made transfer(s) matching claim constraints.

| Field        | Description                        |
| ------------ | ---------------------------------- |
| `proof`      | ZK proof data                      |
| `nullifier`  | Unique identifier (prevents reuse) |
| `claim_id`   | Associated claim                   |
| `created_at` | When proof was created             |

## Flows

### 1. Create Claim (Two-Step Flow)

```
User                    Backend                 Etherscan
 │                         │                        │
 ├──[specify constraints]─▶│                        │
 ├──[click Fetch]─────────▶│                        │
 │                         ├──[fetch transfers]────▶│
 │                         │◀──[transfer list]──────┤
 │                         ├──[save to DB]          │
 │◀──[show transfers]──────┤                        │
 │                         │                        │
 ├──[click Create Claim]──▶│                        │
 │                         ├──[read transfers DB]   │
 │                         ├──[build merkle tree]   │
 │                         ├──[save claim to DB]    │
 │◀──[claim created]───────┤                        │
```

**Steps:**

1.  User specifies:

- message - some message to identify claim (like "Bob 10 USDC transfers claim for hist birthday present")
- chain - chain on which transfers are made
- token address - ERC20 token which was sent from user to recipient
- recipient - address that recieved tokens
- amounts (min, max) (both optional) - user that proves his transfers must have at least MIN and at most MAX totally transfered tokens for specified token, recipient, and time range
- time range (both optional) - time range (including) which filters all transaction

Actions:

- when user fils input for token correctly then this token metadata is fetched and Name and Symbol are displayed

2. User clicks "Fetch Transfers"

- backend fetches from Etherscan transfers with specified constraints, and saves them to DB - those transfers than need to e displayed for user under claim creation form
- if user have connected wallet - he can see his transfers (from = user wallet address) in all transfers tab, or toggle view to see only his transfers
- if user changes transfer constraints (token/recipient/chain/time range) - then transfers list disappears and user need to press fetch transfers again

3. Transfers displayed in preview (virtual scroll, max 5000)
4. If no transfers found → error, cannot proceed
5. User reviews transfers, clicks "Create Claim"
6. Backend reads cached transfers from DB, builds merkle tree
7. Backend saves claim + merkle tree root to database
8. Claim becomes publicly visible

### 2. Generate Proof

```
User                    Frontend                Backend
 │                         │                       │
 ├──[connect wallet]──────▶│                       │
 ├──[select claim]────────▶│                       │
 │                         ├──[fetch claim data]──▶│
 │                         │◀──[claim + merkle]────┤
 │                         │                       │
 │◀──[sign message]────────┤                       │
 ├──[signature]───────────▶│                       │
 │                         │                       │
 │                         ├──[generate ZK proof]  │
 │                         │  (runs locally)       │
 │                         │                       │
 │                         ├──[submit proof]──────▶│
 │                         │                       ├──[verify proof]
 │                         │                       ├──[check nullifier]
 │                         │                       ├──[save to DB]
 │◀──[proof created]───────│◀──[success]───────────┤
```

**Steps:**

1. User connects wallet
2. User selects claim to prove against
3. Frontend fetches claim data + user's transfers + merkle proofs
4. User signs message (claim params hash) with private key
5. Frontend generates ZK proof locally
6. Backend verifies proof
7. Backend checks nullifier not used before
8. Backend saves proof to database

### 3. View Proofs

```
User                    Frontend                Backend
 │                         │                       │
 ├──[view claim]──────────▶│                       │
 │                         ├──[fetch proofs]──────▶│
 │                         │◀──[proof list]────────┤
 │◀──[show all proofs]─────┤                       │
 │                         │                       │
 │  (optional: see own)    │                       │
 ├──[sign message]────────▶│                       │
 │◀──[compute nullifier]───┤                       │
 │                         ├──[filter by nullifier]│
 │◀──[show my proofs]──────┤                       │
```

**Steps:**

1. Anyone can view all proofs for a claim
2. See how many proofs each nullifier has (detect duplicates)
3. To see own proofs: sign message → get nullifier → filter

### 4. Verify Proof

```
Verifier                Frontend                Backend              Etherscan
 │                         │                       │                     │
 ├──[view proof details]──▶│                       │                     │
 │                         ├──[fetch proof data]──▶│                     │
 │                         │◀──[proof + stats]─────┤                     │
 │                         │                       │                     │
 │  ── Get transfers (one of two methods) ──       │                     │
 │                         │                       │                     │
 │  Option A: Blockchain fetch                     │                     │
 ├──[click Fetch]─────────▶│                       │                     │
 │                         ├──[fetch transfers]───▶│                     │
 │                         │◀──[transfer list]─────│                     │
 │                         │                       │                     │
 │  Option B: CSV upload                           │                     │
 ├──[upload CSV from]──────│  (downloaded from etherscan independently)  │
 │   etherscan             │                       │                     │
 │                         │                       │                     │
 │  ── Identify verifier (nullifier derivation) ── │                     │
 │                         │                       │                     │
 ├──[click Sign & Verify]─▶│                       │                     │
 │                         ├──[prepare signing]───▶│                     │
 │                         │◀──[EIP-712 data]──────┤                     │
 │◀──[sign typed data]─────┤                       │                     │
 ├──[signature]────────────▶│                       │                     │
 │                         ├──[process signature]─▶│                     │
 │                         │◀──[nullifier]─────────┤                     │
 │                         │                       │                     │
 │  ── Nullifier checks ──                         │                     │
 │                         │                       │                     │
 │  if nullifier === proof.nullifier               │                     │
 │     → REJECT "Cannot verify own proof"          │                     │
 │                         │                       │                     │
 │  ── Send transfers + nullifier to server ──     │                     │
 │                         │                       │                     │
 │                         ├──[verify proof]───────▶│                     │
 │                         │  (nullifier +          │                     │
 │                         │   transfers)           │                     │
 │                         │                       ├──[check not own proof]
 │                         │                       ├──[check not already verified]
 │                         │                       ├──[sort transfers by timestamp]
 │                         │                       ├──[hash → merkle tree]
 │                         │                       ├──[compare root with proof root]
 │                         │                       ├──[ZK verify proof]
 │                         │                       ├──[record result]
 │                         │◀──[result]────────────┤
 │◀──[show result]─────────┤                       │
```

**Steps:**

1. Verifier opens proof details page
2. Verifier gets transfers via blockchain fetch or CSV upload from etherscan
3. Verifier connects wallet, clicks "Sign & Verify"
4. Frontend prepares EIP-712 data, verifier signs with wallet
5. Signature processed → nullifier derived (verifier's identity for this claim)
6. Client-side check: nullifier !== proof.nullifier (can't verify own proof)
7. Transfers + nullifier sent to server
8. Server double-checks nullifier constraints
9. Server sorts transfers by timestamp, hashes, builds merkle tree
10. Compares computed root with proof's `transfersRootHash`
11. If root matches → verifies ZK proof cryptographically
12. Records verification result with `verifierNullifier`

**Why verifier provides transfers:**

- Verifier may not trust the app's stored transfer data
- By independently sourcing transfers (etherscan CSV or blockchain), verifier confirms data integrity
- If their transfers produce the same merkle root → transfers are authentic

**Verification constraints:**

- Anyone EXCEPT the prover can verify (nullifier match = rejected)
- One successful verification per verifier per proof
- Failed verifications can be retried (old failed record replaced)
- Verification counter shows per-proof totals (successful / failed)

### 5. Verification Identity (Nullifier for Verifiers)

Same mechanism as proof generation identity:

- Verifier signs EIP-712 claim typed data with their wallet
- `nullifier = poseidon2_hash(signature_bytes)`
- Deterministic: same wallet + same claim = same nullifier every time
- Stored as `verifierNullifier` in `proof_verifications` table (no addresses in DB)

## ZK Circuit

### Public Inputs (visible to all)

- `claim_id`, `claim_message_hash`
- `token_address`, `recipient_address`
- `min_transfers_sum`, `max_transfers_sum`
- `from_block_timestamp`, `to_block_timestamp`
- `transfers_root_hash`
- `nullifier`

### Private Inputs (hidden)

- `transfers[]` - user's actual transfers
- `transfers_proofs[]` - merkle proofs
- `prover_pub_key_x/y` - ECDSA public key
- `prover_signature` - signed message

### Circuit Logic

1. Reconstruct message hash from public params
2. Verify signature against message
3. Recover sender address from signature
4. Verify each transfer exists in merkle tree
5. Verify transfers match constraints
6. Compute nullifier from signature

## Security Properties

| Property         | Guarantee                                   |
| ---------------- | ------------------------------------------- |
| **Privacy**      | Sender address never revealed               |
| **Uniqueness**   | One proof per user per claim (nullifier)    |
| **Integrity**    | Cannot fake transfers (merkle verification) |
| **Authenticity** | Only actual sender can prove (signature)    |

## Nullifier System

Prevents proof reuse and duplicate proofs.

```
nullifier = poseidon2_hash(signature_bytes)
```

Since ECDSA signatures are deterministic (RFC 6979):

- Same key + same message = same signature = same nullifier
- Different claims = different messages = different nullifiers
- Different users = different keys = different nullifiers

### Duplicate Detection

If user creates multiple proofs with same nullifier:

- System tracks count per nullifier
- Viewers can see "X proofs from this nullifier"
- Indicates potential proof sharing (suspicious)

## Merkle Tree

### Leaf Construction

```
leaf = poseidon2_hash(
  sender_address,
  recipient_address,
  token_address,
  amount,
  block_timestamp
)
```

### Purpose

- Prove transfer exists in valid set
- Without revealing which specific transfer
- Backend stores tree, provides inclusion proofs
