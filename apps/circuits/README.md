# Circut

## Circut input

### 1. Public Inputs (visible to verifiers)

- **claim_id**: Unique identifier for the claim
- **claim_message_hash**: Poseidon2 hash of the claim message
- **token_address**: ERC20 token contract address
- **recipient_address**: Transfer recipient address
- **min_transfers_sum**: Minimum sum of token transfers (0 = no constraint)
- **max_transfers_sum**: Maximum sum of token transfers (0 = no constraint)
- **from_block_timestamp**: Earliest block timestamp (0 = no constraint)
- **to_block_timestamp**: Latest block timestamp (0 = no constraint)
- **transfers_root_hash**: Merkle tree root of all valid transfers
- **nullifier**: Deterministic identifier that prevents proof reuse (see below)

### 2. Private Inputs (hidden from verifiers)

- **transfers**: Array of up to 50 transfers (amount, block_timestamp)
- **transfers_proofs**: Merkle proofs for each transfer
- **are_transfer_leaves_even**: Path indicators for merkle proof verification
- **transfers_amount**: Number of actual transfers being proven
- **prover_pub_key_x**: Prover's ECDSA public key (X coordinate)
- **prover_pub_key_y**: Prover's ECDSA public key (Y coordinate)
- **prover_signature**: ECDSA signature (64 bytes: r + s)

## Transfer merkle tree

Each leaf is a Poseidon2 hash of (sender_address, recipient_address, token_address, amount, block_timestamp)

## Nullifier System (Prevents Proof Reuse)

The nullifier ensures each user can only generate **one valid proof per claim**:

1. **Message Construction**: The circuit reconstructs a message hash from all public parameters:

   ```
   message = keccak256(claim_id, claim_message_hash, token_address, recipient_address, min_transfers_sum, max_transfers_sum, from_timestamp, to_timestamp, transfers_root_hash)
   ```

   Total: 208 bytes (32+32+32+32+16+16+8+8+32)

2. **Signature Verification**: The prover signs this message with their private key. The circuit:
   - Reconstructs the message hash from public parameters
   - Recovers the sender address from the signature using ecrecover
   - Uses the recovered address to verify transfers in the merkle tree

3. **Nullifier Computation**: The nullifier is computed as:

   ```
   nullifier = poseidon2_hash(signature_bytes)
   ```

   Since ECDSA signatures are deterministic (RFC 6979), the same key + message always produces the same signature, thus the same nullifier.

4. **Security Properties**:
   - ✅ Users cannot generate multiple proofs for the same claim (same nullifier would be rejected)
   - ✅ Users cannot manipulate the message (circuit enforces message format)
   - ✅ Sender address remains private (recovered in circuit, never revealed)
   - ✅ Cannot brute-force nullifier to identify sender (nullifier is hash of signature, not address)

## Backend Flow

1. User specifies public parameters (claim_id, claim_message_hash, constraints, etc.)
2. Backend retrieves all transfers matching constraints from Etherscan API
3. Backend builds merkle tree from transfers and shares the root hash
4. User constructs message by hashing all public parameters (including claim_message_hash)
5. User signs the message and computes nullifier
6. User generates ZK proof with their private transfers
7. Backend verifies proof and checks nullifier hasn't been used before
8. Backend stores nullifier in database to prevent reuse

## Security Guarantees

- **Privacy**: Sender address is never revealed publicly
- **Uniqueness**: Each user can only prove once per claim (via nullifier)
- **Integrity**: Users cannot fake transfers (merkle tree verification)
- **Authenticity**: Only the actual sender can create valid proofs (signature verification)

## TODO:

- make that prover can be sender or reciever (is_prover_sender: bool)
- add pub chain_id parameter
- add pub block_hash parameter
- add transfers_amount constraints (min transfers, max transfers)
