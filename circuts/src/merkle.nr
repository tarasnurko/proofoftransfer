use dep::poseidon::poseidon2::Poseidon2;
use crate::types::MERKLE_DEPTH;

// Compute Merkle leaf hash for a transfer
// Using Poseidon2 hash (ZK-friendly and efficient)
pub fn compute_transfer_leaf(
    sender_address: Field,
    receiver_address: Field,
    token_address: Field,
    amount: Field,
    timestamp: Field,
    tx_hash: [u8; 32]
) -> Field {
    // Convert tx_hash to Field
    let tx_hash_field = field_from_bytes_32(tx_hash);

    // Use Poseidon2 hash with all transfer parameters
    // This ensures the leaf uniquely identifies the transfer
    Poseidon2::hash([
        sender_address,
        receiver_address,
        token_address,
        amount,
        timestamp,
        tx_hash_field
    ], 6)
}

// Verify Merkle inclusion proof
pub fn verify_merkle_proof(
    leaf: Field,
    merkle_path: [Field; MERKLE_DEPTH],
    path_indices: [Field; MERKLE_DEPTH],
    root: Field
) -> bool {
    let mut current = leaf;

    // Traverse from leaf to root
    for i in 0..MERKLE_DEPTH {
        let sibling = merkle_path[i];

        // Determine hash order based on path direction
        let (hash_left, hash_right) = if path_indices[i] == 0 {
            (current, sibling)  // Current is left child
        } else {
            (sibling, current)  // Current is right child
        };

        // Hash parent node using Poseidon2
        current = Poseidon2::hash([hash_left, hash_right], 2);
    }

    // Final hash should equal the root
    current == root
}

// Helper function
fn field_from_bytes_32(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + bytes[i] as Field;
    }
    result
}
