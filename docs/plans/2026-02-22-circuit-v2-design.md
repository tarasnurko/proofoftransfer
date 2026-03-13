# Circuit V2 — Prover Role, Token Types, TX Hash, Transfer Count Constraints

## Changes

### 1. Prover Role (sender or recipient)
- `recipientAddress` → `counterpartyAddress` everywhere (DB, circuit, TS, UI)
- Add `isProverSender: bool` — when true prover=sender (current behavior), when false prover=recipient
- Circuit: swap from/to in transfer hash based on `is_prover_sender`
- UI: label shows "Recipient" or "Sender" dynamically based on role

### 2. Token Type (erc20, erc721, erc1155)
- Add `tokenType` to claims (required, user selects)
- No circuit changes — amount=1 for ERC721, amount=tokenValue for ERC1155
- App routes to correct Etherscan endpoint per token type
- New `EtherscanNFTTransfer` type (shared shape for 721+1155: `tokenID` + `tokenValue`)

### 3. Transaction Hash in Transfer
- Transfer struct: add `tx_hash: Field`
- Hash function: 6 fields now `hash(from, to, token, amount, timestamp, tx_hash)`
- All transfer hashing/mapping updated

### 4. Min/Max Transfers Count
- `min_transfers_count: u32` and `max_transfers_count: u32`
- 0 = no constraint (same pattern as sum constraints)
- Added to Constraints struct, EIP-712 message, DB, UI

## Modular Noir Architecture

Extract shared logic into library crate for future super claim reuse.

```
packages/circuit-noir/          ← NEW Noir library (type = "lib")
  Nargo.toml                    ← depends on poseidon, ecrecover
  src/
    lib.nr                      ← re-exports all modules
    transfer.nr                 ← Transfer struct + hash_transfer (6 fields, from/to swap)
    identity.nr                 ← verify_prover (ecrecover + nullifier check)
    validation.nr               ← validate_transfers loop (timestamps, merkle, sum)
    constraints.nr              ← Constraints struct + check functions
    merkle_tree.nr              ← compute_merkle_root (moved from circuts/)
    utils.nr                    ← u128/u64 byte conversions (moved from circuts/)
    constants.nr                ← MERKLE_TREE_HEIGHT, MAX_TRANSFERS

apps/circuts/                   ← Claim circuit (binary)
  Nargo.toml                    ← depends on circuit-noir, keccak256
  src/
    main.nr                     ← ClaimInputs struct, EIP-712 reconstruction, orchestration
```

### Shared Structs

```noir
// transfer.nr
pub struct Transfer {
    pub amount: u128,
    pub block_timestamp: u64,
    pub tx_hash: Field,
}

// constraints.nr
pub struct Constraints {
    pub min_transfers_sum: u128,
    pub max_transfers_sum: u128,
    pub min_transfers_count: u32,
    pub max_transfers_count: u32,
    pub from_block_timestamp: u64,
    pub to_block_timestamp: u64,
}

// identity.nr
pub struct ProverIdentity {
    pub pub_key_x: [u8; 32],
    pub pub_key_y: [u8; 32],
    pub signature: [u8; 64],
}
```

### Claim-Specific Struct (in main.nr)

```noir
struct ClaimInputs {
    claim_id: Field,
    claim_message_hash: Field,
    token_address: Field,
    counterparty_address: Field,
    is_prover_sender: bool,
    chain_id: Field,
    transfers_root_hash: Field,
    nullifier: Field,
}
```

### Updated main signature (17 params → 7)

```noir
fn main(
    claim: pub ClaimInputs,
    constraints: pub Constraints,
    transfers: [Transfer; MAX_TRANSFERS],
    transfers_proofs: [[Field; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    are_transfer_leaves_even: [[bool; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    transfers_amount: u32,
    prover: ProverIdentity,
)
```

## EIP-712 Update

New CLAIM_TYPEHASH string:
```
Claim(bytes32 claimId,bytes32 claimMessageHash,address tokenAddress,address counterpartyAddress,bool isProverSender,uint128 minTransfersSum,uint128 maxTransfersSum,uint32 minTransfersCount,uint32 maxTransfersCount,uint64 fromBlockTimestamp,uint64 toBlockTimestamp,bytes32 transfersRootHash)
```

12 data fields + typehash = 13 × 32 = 416 bytes struct encoding.

## DB Schema Changes

**claims table:**
- `recipientAddress` → `counterpartyAddress`
- Add `isProverSender: boolean` (required)
- Add `tokenType: varchar` (required, 'erc20' | 'erc721' | 'erc1155')
- Add `minTransfersCount: integer` (default 0)
- Add `maxTransfersCount: integer` (default 0)

**transfers table:**
- Add `txHash: varchar`

Migrations wiped and regenerated from scratch.

## TypeScript Changes

**`@repo/types`:**
- Add `EtherscanNFTTransfer` (tokenID + tokenValue, covers 721+1155)
- Add `TokenType = 'erc20' | 'erc721' | 'erc1155'`

**`circuit-utils`:**
- `CircuitTransfer`: add `tx_hash: string`
- `hashTransfer`: 6 fields (+ txHash)
- `eip712`: rename recipientAddress→counterpartyAddress, add isProverSender, minTransfersCount, maxTransfersCount
- Mapping: `mapERC20ToCircuit`, `mapNFTToCircuit` (amount=tokenValue, tx_hash=hash)

**`apps/web`:**
- Proof generation: updated circuit inputs, EIP-712 signing
- Proof verification: updated merkle tree building with tx_hash
- Etherscan fetching: route to tokentx / tokennfttx / token1155tx by tokenType
- Components: recipientAddress→counterpartyAddress, dynamic labels, tokenType selector, isProverSender toggle, min/max count fields
- Actions: updated schemas
