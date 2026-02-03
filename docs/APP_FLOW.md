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

| Field | Description |
|-------|-------------|
| `claim_id` | Unique identifier |
| `claim_message_hash` | Poseidon2 hash of claim message |
| `token_address` | ERC20 token contract |
| `recipient_address` | Transfer recipient |
| `min_transfers_sum` | Min sum constraint (0 = none) |
| `max_transfers_sum` | Max sum constraint (0 = none) |
| `from_block_timestamp` | Earliest timestamp (0 = none) |
| `to_block_timestamp` | Latest timestamp (0 = none) |
| `transfers_root_hash` | Merkle root of valid transfers |

### Transfer

On-chain token transfer that matches claim constraints.

| Field | Description |
|-------|-------------|
| `sender_address` | Who sent tokens |
| `recipient_address` | Who received tokens |
| `token_address` | Token contract |
| `amount` | Transfer amount |
| `block_timestamp` | When transfer occurred |

### Proof

ZK proof that user made transfer(s) matching claim constraints.

| Field | Description |
|-------|-------------|
| `proof` | ZK proof data |
| `nullifier` | Unique identifier (prevents reuse) |
| `claim_id` | Associated claim |
| `created_at` | When proof was created |

## Flows

### 1. Create Claim

```
User                    Backend                 Etherscan
 │                         │                        │
 ├──[specify constraints]─▶│                        │
 │                         ├──[fetch transfers]────▶│
 │                         │◀──[transfer list]──────┤
 │                         │                        │
 │                         ├──[build merkle tree]   │
 │                         ├──[save to DB]          │
 │◀──[claim created]───────┤                        │
```

**Steps:**
1. User specifies: token, recipient, amount range, time range, message
2. Backend fetches matching transfers from Etherscan API
3. Backend builds merkle tree from transfers (leaf = hash of transfer data)
4. Backend saves claim + transfers + merkle tree to database
5. Claim becomes publicly visible

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

| Property | Guarantee |
|----------|-----------|
| **Privacy** | Sender address never revealed |
| **Uniqueness** | One proof per user per claim (nullifier) |
| **Integrity** | Cannot fake transfers (merkle verification) |
| **Authenticity** | Only actual sender can prove (signature) |

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
