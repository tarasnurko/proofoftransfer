# Zero-Knowledge Proof of ERC-20 Transfer Amounts (Privacy-Preserving)

## Purpose

Allow a user to prove, in zero knowledge, that **their hidden Ethereum address** transferred an amount of a given ERC-20 token **between X and Y** to a specific receiver address **within a given date range**, such that:

- The sender address is **never revealed**
- Anyone can verify the proof using public blockchain data
- The proof **cannot be reused** by another user
- The proof is bound to **real on-chain transfers**

---

## High-Level Idea (Correct Model)

The ZK circuit proves the following statement:

> “I know a private Ethereum address `A` and a set of transfers from `A` such that:
>
> - All those transfers are included in the public set of ERC-20 transfers to a given receiver, token, and date range
> - The total transferred amount is between `minAmount` and `maxAmount`
> - I control address `A`
> - Address `A` is never revealed”

This is achieved by:

- A **public Merkle tree** of _all_ relevant transfers
- **Private inclusion proofs** for only the user’s transfers
- A **private address**, bound via a commitment
- A **signature-based ownership proof** inside the circuit

---

## Actors

- **Prover (Alice)**: owns a private Ethereum address and generates the proof
- **Verifier (Bob)**: verifies the proof using public inputs and public blockchain data
- **Blockchain / Indexer**: source of truth (e.g., Etherscan)

---

## Public Parameters (Agreed Beforehand)

These parameters define _which transfers are relevant_ and are known to everyone:

- `tokenAddress`
- `receiverAddress`
- `startDate`
- `endDate`
- `minAmount`
- `maxAmount`

---

## Data Retrieval (Off-Chain, Public)

### Step 1: Fetch all relevant transfers

Both prover and verifier independently fetch ERC-20 `Transfer` events using the same public query:

- `token == tokenAddress`
- `to == receiverAddress`
- `timestamp ∈ [startDate, endDate]`

Result:

```
ALL_TRANSFERS = [
{ from, to, amount, txHash, timestamp },
...
]
```

This list is **public**, deterministic, and verifiable by anyone.

---

## Public Merkle Tree (Global Tree)

### Step 2: Build a Merkle tree of ALL transfers

Each transfer is encoded as a leaf:

```
leaf = Hash(
from,
to,
token,
amount,
timestamp,
txHash
)
```

- Hash function must be ZK-friendly (e.g., Poseidon)
- Leaves are ordered deterministically (e.g., by blockNumber + txIndex)

Build a Merkle tree over **ALL_TRANSFERS**.

### Public Input:

```
globalTransfersRoot
```

This root represents **all valid transfers** in scope.

---

## Prover’s Private Selection

### Step 3: Prover filters their own transfers

Privately, Alice filters:

```
MY_TRANSFERS = ALL_TRANSFERS where from == AliceAddress
```

Assume this yields `k` transfers.

Alice does **not** reveal:

- Her address
- Which transfers are hers
- How many transfers she made

---

## Address Privacy & Ownership

### Step 4: Address commitment (privacy)

Alice computes:

```
addrCommit = Hash(AliceAddress, salt)
```

- `AliceAddress` and `salt` are **private**
- `addrCommit` is a **public input**
- This binds all proofs to the same hidden address without revealing it

---

### Step 5: Ownership proof (anti-reuse)

- Verifier provides a random `challenge`
- Alice signs `challenge` with her Ethereum private key
- Signature is **private witness**
- Inside the circuit:

```
ecrecover(challenge, signature) == AliceAddress
```

This proves:

- Alice controls the private key
- No one else can reuse her proof

---

## What the ZK Circuit Receives

### Public Inputs

```
globalTransfersRoot
addrCommit
tokenAddress
receiverAddress
startDate
endDate
minAmount
maxAmount
challenge
```

### Private Witnesses

For each of Alice’s transfers `i`:

```
AliceAddress
salt
signature

transfer_i:
amount_i
timestamp_i
txHash_i
merklePath_i // path proving inclusion in globalTransfersRoot
```

---

## What the ZK Circuit Verifies (Exact Constraints)

### 1. Address binding

```
Hash(AliceAddress, salt) == addrCommit
```

---

### 2. Address ownership

```
ecrecover(challenge, signature) == AliceAddress
```

---

### 3. Transfer validity (for each private transfer)

For each transfer `i`, the circuit checks:

- Recompute leaf:

```
leaf_i = Hash(
AliceAddress,
receiverAddress,
tokenAddress,
amount_i,
timestamp_i,
txHash_i
)
```

- Verify Merkle inclusion:

```
MerkleVerify(leaf_i, merklePath_i, globalTransfersRoot) == true
```

This guarantees:

- Transfer exists on-chain
- Transfer is within the public scope
- Transfer was sent **from Alice’s address**

---

### 4. Amount constraint

The circuit computes:

```
totalAmount = Σ amount_i
```

And enforces:

```
minAmount ≤ totalAmount ≤ maxAmount
```

---

## What the Circuit Does NOT Do

The circuit does **not**:

- Fetch blockchain data
- Loop over all transfers
- Compare Alice’s transfers to unrelated transfers
- Reveal sender address or individual transfers

All heavy data work is done **off-chain**.

---

## Verification Procedure (Verifier Side)

1. Fetch `ALL_TRANSFERS` using public parameters
2. Rebuild the global Merkle tree
3. Compute `globalTransfersRoot`
4. Check:
   - `computedRoot == public.globalTransfersRoot`
   - ZK proof validity

If both pass, the verifier is convinced the claim is true.

---

## Security Properties Achieved

- ✅ Sender address remains private
- ✅ Proof cannot be reused by others
- ✅ Transfers are guaranteed to be real
- ✅ Amount constraints are enforced
- ✅ Anyone can verify independently

---

## Summary (One Paragraph)

The system works by committing publicly to **all valid transfers** in a given scope via a Merkle root, while the prover privately proves inclusion of **only their own transfers** along with ownership of the hidden sender address and a bounded sum of amounts. The verifier checks only public data and the ZK proof, learning nothing about the sender’s identity.

---

## Notes

- This design works with **Circom**, **Noir**, or any ZK DSL
- Merkle tree depth depends on worst-case transfer count
- Inclusion proofs scale linearly with number of user transfers
- Fresh challenge is required per proof (anti-replay)

---
