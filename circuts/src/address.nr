use dep::keccak256::keccak256;

// Verify address commitment
// Constraint: Hash(address || salt) == commitment
pub fn verify_address_commitment(
    address: Field,
    salt: Field,
    commitment: Field
) -> bool {
    // Convert address and salt to bytes
    let address_bytes: [u8; 32] = address.to_be_bytes();
    let salt_bytes: [u8; 32] = salt.to_be_bytes();

    // Concatenate address and salt (take last 20 bytes of address for Ethereum address)
    let mut preimage: [u8; 52] = [0; 52];
    for i in 0..20 {
        preimage[i] = address_bytes[12 + i];  // Take last 20 bytes (Ethereum address)
    }
    for i in 0..32 {
        preimage[20 + i] = salt_bytes[i];
    }

    // Compute Keccak256 hash
    let hash: [u8; 32] = keccak256(preimage, 52);

    // Convert hash to Field
    let computed_commitment = field_from_bytes(hash);

    // Verify commitment matches
    computed_commitment == commitment
}

// Helper to convert bytes to Field
fn field_from_bytes(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + bytes[i] as Field;
    }
    result
}
