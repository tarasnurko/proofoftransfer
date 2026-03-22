# Multi-Chain Super Claims Design

## Problem

Currently a claim covers **one chain, one token, one recipient**. All matching transfers from that chain form a single merkle tree. The prover proves their transfers are in that tree.

If we want claims like "I donated $10 to Charity X in January" where Charity X accepts donations on Ethereum, Base, and Polygon — we need multi-chain support.

**Naive approach (separate claims per chain) breaks privacy:** if only 2 people donated on Polygon, the anonymity set is 2. An observer sees "someone proved for the Polygon claim" and can narrow down the identity.

**Solution:** Super claims with a two-tier merkle tree that hides which chain the prover used.

---

## Data Model

### Super Claim

Top-level entity visible to users. Contains:

- `id` — unique identifier
- `message` — human-readable claim text ("I donated $10 to Charity X in January")
- `messageHash` — poseidon2 hash of message
- `superRoot` — root of the super merkle tree (explained below)
- `minTransfersSum`, `maxTransfersSum` — transfer amount constraints
- `fromBlockTimestamp`, `toBlockTimestamp` — time range constraints

Constraints live on the super claim, shared by all sub-claims. This means tokens across sub-claims must be comparable in value and decimals (e.g., USDC on Ethereum, Base, Polygon all have 6 decimals).

### Sub-Claim

Each sub-claim covers one chain+token+recipient combination:

- `id` — unique identifier
- `superClaimId` — parent super claim
- `chainId` — chain (e.g., 1 = Ethereum, 137 = Polygon, 8453 = Base)
- `tokenAddress` — token contract on this chain
- `recipientAddress` — recipient on this chain
- `merkleRoot` — root of this sub-claim's transfer tree

A super claim has 1..N sub-claims.

---

## Merkle Tree Structure (Two-Tier)

### Tier 1: Sub-Claim Trees (per chain)

Each sub-claim has its own merkle tree, exactly like today's claim merkle tree:

- Leaves = hashed transfers from that chain matching (token, recipient, timestamp range)
- `leaf = poseidon2(from, to, tokenAddress, amount, blockTimestamp)`
- Sorted by `blockTimestamp` ascending
- Height = 20 (supports up to 1M transfers)
- Hash function = poseidon2

Result: each sub-claim has a root `R_A`, `R_B`, `R_C`, etc.

### Tier 2: Super Tree

A small merkle tree whose **leaves are the sub-claim roots**:

```
         superRoot
        /         \
      H_AB        H_C0
      /  \        /  \
    R_A  R_B    R_C  ZERO
```

- Leaves = `[R_A, R_B, R_C, ...]` (padded with zero values if needed)
- Height = small (e.g., 4 → supports up to 16 sub-claims)
- Hash function = poseidon2 (same as tier 1)
- Built using the same `compute_merkle_root` logic

The `superRoot` is stored on the super claim and is the only root exposed publicly.

---

## Proof Generation Flow

Alice donated on Polygon (sub-claim B). She wants to prove for the super claim.

### Step 1: Prepare Signing Data

App loads the super claim and all sub-claims. Computes `superRoot` from all sub-claim roots. Builds EIP-712 typed data from super claim fields (see EIP-712 section below).

### Step 2: Alice Signs

Alice signs the EIP-712 message with her wallet. The message is based on **super claim data only** (no chain/token/recipient — see EIP-712 section). This means the signature and nullifier are the same regardless of which sub-claim she'll prove against.

### Step 3: Derive Nullifier

`nullifier = poseidon2(signature)` — same as today.

### Step 4: Prepare Circuit Inputs for Sub-Claim B

App identifies Alice's transfers in sub-claim B (Polygon). For each transfer:

1. Hash the transfer → leaf
2. Generate merkle proof (path + indices) within sub-claim B's tree (tier 1, height 20)

These reconstruct `R_B` in the circuit.

### Step 5: Prepare Super Tree Proof

Generate merkle proof for `R_B` within the super tree (tier 2, height ~4):

1. `R_B` is at position 1 in the super tree leaves
2. Its sibling path = `[R_A, H_C0, ...]`
3. This proof allows the circuit to reconstruct `superRoot` from `R_B`

### Step 6: Generate ZK Proof

Client runs the circuit in browser (Noir + bb.js) with:

**Public inputs:**
- `superClaimId`
- `superClaimMessageHash`
- `minTransfersSum`, `maxTransfersSum`
- `fromBlockTimestamp`, `toBlockTimestamp`
- `superRoot`
- `nullifier`

**Private inputs:**
- Alice's transfers `[{amount, blockTimestamp}; MAX_TRANSFERS]`
- Tier 1 merkle proofs `[[Field; TREE_HEIGHT]; MAX_TRANSFERS]` (within sub-claim tree)
- Tier 1 leaf positions `[[bool; TREE_HEIGHT]; MAX_TRANSFERS]`
- `subclaim_root` — the root `R_B` (private! nobody sees this)
- `tokenAddress` — the token on this sub-claim's chain (private!)
- `recipientAddress` — the recipient on this sub-claim's chain (private!)
- Tier 2 merkle proof `[Field; SUPER_TREE_HEIGHT]` (within super tree)
- Tier 2 leaf position `[bool; SUPER_TREE_HEIGHT]`
- `transfersAmount` — count of real transfers
- `proverPubKeyX`, `proverPubKeyY`, `proverSignature`

### Step 7: Submit Proof

Proof stored under the super claim with nullifier. Nullifier uniqueness enforced per super claim.

---

## Circuit Logic

The circuit performs two-tier merkle root reconstruction plus all existing validations.

### What Changes From Current Circuit

**Moved from public to private:**
- `tokenAddress`
- `recipientAddress`
- `chainId` (removed entirely — see EIP-712 section)
- `transfersRootHash` → renamed `subclaim_root` (private)

**New public input:**
- `superRoot`

**New private inputs:**
- `superProof: [Field; SUPER_TREE_HEIGHT]` — merkle path in super tree
- `superIsEven: [bool; SUPER_TREE_HEIGHT]` — sibling positions in super tree

### Circuit Pseudocode

```noir
fn main(
    // super claim data (public)
    super_claim_id: pub Field,
    super_claim_message_hash: pub Field,
    min_transfers_sum: pub u128,
    max_transfers_sum: pub u128,
    from_block_timestamp: pub u64,
    to_block_timestamp: pub u64,
    super_root: pub Field,
    nullifier: pub Field,

    // private inputs — sub-claim specific
    token_address: Field,          // was public, now private
    recipient_address: Field,      // was public, now private
    subclaim_root: Field,          // was public transfers_root_hash, now private

    // private inputs — super tree proof
    super_proof: [Field; SUPER_TREE_HEIGHT],
    super_is_even: [bool; SUPER_TREE_HEIGHT],

    // private inputs — transfers (same as today)
    transfers: [Transfer; MAX_TRANSFERS],
    transfers_proofs: [[Field; TREE_HEIGHT]; MAX_TRANSFERS],
    are_transfer_leaves_even: [[bool; TREE_HEIGHT]; MAX_TRANSFERS],
    transfers_amount: u32,

    // private inputs — prover identity (same as today)
    prover_pub_key_x: [u8; 32],
    prover_pub_key_y: [u8; 32],
    prover_signature: [u8; 64],
) {
    // 1. Verify signature and nullifier (same as today)
    let hashed_message = reconstruct_eip712_message(
        super_claim_id,
        super_claim_message_hash,
        min_transfers_sum, max_transfers_sum,
        from_block_timestamp, to_block_timestamp,
        super_root,
    );
    let sender_address = ecrecover(pub_key_x, pub_key_y, signature, hashed_message);
    assert(compute_nullifier(signature) == nullifier);

    // 2. TIER 1: For each transfer, reconstruct sub-claim root
    //    Exactly like today, but checking against private subclaim_root
    let mut transfers_sum: u128 = 0;
    for i in 0..MAX_TRANSFERS {
        if i < transfers_amount {
            transfers_sum += transfers[i].amount;

            // timestamp constraints (same as today)
            assert((from_block_timestamp == 0) | (transfers[i].block_timestamp >= from_block_timestamp));
            assert((to_block_timestamp == 0) | (transfers[i].block_timestamp <= to_block_timestamp));

            // hash transfer using private token_address and recipient_address
            let leaf = hash_transfer(
                sender_address,
                recipient_address,  // private
                token_address,      // private
                transfers[i].amount,
                transfers[i].block_timestamp,
            );

            // reconstruct sub-claim root from leaf
            let computed_subclaim_root = compute_merkle_root(
                leaf,
                transfers_proofs[i],
                are_transfer_leaves_even[i],
            );

            // check against PRIVATE subclaim_root (not public anymore)
            assert(computed_subclaim_root == subclaim_root);
        }
    }

    // 3. TIER 2: Reconstruct super root from sub-claim root
    //    Same compute_merkle_root function, different tree
    let computed_super_root = compute_merkle_root(
        subclaim_root,     // sub-claim root becomes a "leaf"
        super_proof,       // path up the super tree
        super_is_even,     // sibling positions
    );
    assert(computed_super_root == super_root);

    // 4. Sum constraints (same as today)
    assert((min_transfers_sum == 0) | (transfers_sum >= min_transfers_sum));
    assert((max_transfers_sum == 0) | (transfers_sum <= max_transfers_sum));
}
```

### Why This Works

The circuit chains two reconstructions:

```
transfer leaf ──reconstruct (height 20)──> subclaim_root ──reconstruct (height ~4)──> super_root
     ^                                          ^                                         ^
  from private                              private                                    PUBLIC
  transfer data                          (never exposed)                          (only thing visible)
```

- **Tier 1** proves: "my transfers are in a tree with root `subclaim_root`" (same as today, but `subclaim_root` is private)
- **Tier 2** proves: "`subclaim_root` is a leaf of the super tree with root `super_root`"
- Combined: "my transfers are in one of the sub-claim trees that make up this super claim"

The circuit never reveals `subclaim_root`, `tokenAddress`, `recipientAddress`, or which sub-claim was used.

---

## Verification Flow

Bob wants to verify Alice's proof.

### Step 1: Connect Wallet and Sign

Bob signs the super claim's EIP-712 data → derives his nullifier. If his nullifier matches the proof's nullifier → reject (can't verify own proof). Same as today but signing super claim data.

### Step 2: Provide Transfers for ALL Chains

This is the key difference: **Bob must provide transfers for every sub-claim (every chain)**.

For each sub-claim, Bob independently fetches transfers:
- Sub-claim A (Ethereum): fetch from etherscan or Ethereum RPC
- Sub-claim B (Polygon): fetch from polygonscan or Polygon RPC
- Sub-claim C (Base): fetch from basescan or Base RPC

### Step 3: Server Rebuilds All Trees

For each sub-claim:
1. Sort transfers by `blockTimestamp` ascending
2. Hash each transfer → leaf
3. Build merkle tree → sub-claim root `R_x`

Then build the super tree from all sub-claim roots → compute `superRoot`.

### Step 4: Compare Super Root

```
computed_super_root == proof.publicInputs.superRoot ?
```

If yes → all chains' transfer data is intact. Bob has confirmed the data integrity across ALL chains simultaneously.

If no → data mismatch somewhere. Bob cannot determine which chain's data differs (privacy preserved even in failure).

### Step 5: Verify ZK Proof

Run UltraHonk verification on the proof against the public inputs (which include `superRoot`). If valid → the prover's transfers satisfy the constraints.

### What Bob Learns

- The transfer data across all chains is correct (super root matches)
- Someone's transfers in one of the sub-claims satisfy the constraints
- **NOT** which sub-claim/chain the prover used

---

## EIP-712 Signing Changes

### Current EIP-712 Message

```
Claim(
    bytes32 claimId,
    bytes32 claimMessageHash,
    address tokenAddress,        // chain-specific
    address recipientAddress,    // chain-specific
    uint128 minTransfersSum,
    uint128 maxTransfersSum,
    uint64 fromBlockTimestamp,
    uint64 toBlockTimestamp,
    bytes32 transfersRootHash    // single chain's root
)
```

Domain: `{ name, version, chainId, verifyingContract }`

Problem: includes `chainId`, `tokenAddress`, `recipientAddress`, `transfersRootHash` — all chain-specific. Different sub-claims → different message → different signature → **different nullifier**. User could submit one proof per sub-claim.

### New EIP-712 Message

```
SuperClaim(
    bytes32 superClaimId,
    bytes32 superClaimMessageHash,
    uint128 minTransfersSum,
    uint128 maxTransfersSum,
    uint64 fromBlockTimestamp,
    uint64 toBlockTimestamp,
    bytes32 superRoot            // commits to ALL sub-claims
)
```

Domain: `{ name, version, chainId: 0, verifyingContract }` — `chainId` fixed to 0 (chain-agnostic). The `superRoot` already commits to all chain data, so replay protection comes from the root, not the domain chain.

This ensures: **same wallet + same super claim → same signature → same nullifier**, regardless of which sub-claim the prover uses.

---

## Constraints Handling

### Shared Constraints

`minTransfersSum`, `maxTransfersSum`, `fromBlockTimestamp`, `toBlockTimestamp` are defined once on the super claim and apply to all sub-claims equally.

### Decimal Compatibility

Since the sum constraint is a raw token amount, all tokens across sub-claims should use the same number of decimals for the amounts to be comparable.

Example — valid:
- Ethereum: USDC (6 decimals), min 10_000_000 ($10)
- Base: USDC (6 decimals), min 10_000_000 ($10)
- Polygon: USDC (6 decimals), min 10_000_000 ($10)

Example — problematic:
- Ethereum: USDC (6 decimals), 10_000_000 = $10
- Polygon: DAI (18 decimals), 10_000_000 = $0.00000000001

**For v1: require all sub-claim tokens to have equal decimals.** Enforce at super claim creation time. This covers the primary use case (same stablecoin across chains).

---

## Super Tree Height

The super tree height determines max number of sub-claims:

| Height | Max Sub-Claims | Circuit Cost |
|--------|---------------|--------------|
| 2      | 4             | +2 hashes    |
| 3      | 8             | +3 hashes    |
| 4      | 16            | +4 hashes    |

Height 4 (16 sub-claims) is reasonable. Circuit cost increase is negligible compared to tier 1 (height 20 * 50 transfers = 1000 hashes). The super tree adds at most 4 hashes.

---

## Open Questions

1. **Cross-chain sum aggregation** — current design: prover satisfies constraints from ONE chain's transfers only. Should a prover combine $5 from Ethereum + $5 from Polygon to meet $10 min? This requires fundamentally different circuit design (multiple sub-tree proofs in one circuit run).

2. **Sub-claim addition after creation** — can new sub-claims be added to an existing super claim? This changes the super root, invalidating all existing proofs. Probably: no, super claim is immutable once created.

3. **CLAIM_TYPEHASH update** — EIP-712 struct type changes. Old proofs are incompatible. Need migration strategy or versioning.

4. **Backward compatibility** — should single-chain claims still work without the super tree layer? Could treat single-chain as super claim with 1 sub-claim (super root = sub-claim root with height-1 tree).

5. **Verifier UX** — verifier must now fetch transfers from ALL chains. More work. Should the app help by pre-fetching from blockchain, or is that counter to the trust model (verifier provides their own data)?

6. **Super tree padding** — if super claim has 3 sub-claims but tree height is 4 (capacity 16), remaining leaves are zeros. Prover must NOT be able to use a zero leaf as a valid sub-claim root. The zero values used for padding must differ from any possible real sub-claim root.
