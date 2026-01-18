use dep::poseidon::poseidon2;

// Helper function to convert u128 to big-endian bytes
pub fn u128_to_be_bytes(value: u128) -> [u8; 16] {
    let mut bytes: [u8; 16] = [0; 16];
    let mut remaining = value;

    for i in 0..16 {
        bytes[15 - i] = (remaining & 0xff) as u8;
        remaining = remaining >> 8;
    }

    bytes
}

// Helper function to convert u64 to big-endian bytes
pub fn u64_to_be_bytes(value: u64) -> [u8; 8] {
    let mut bytes: [u8; 8] = [0; 8];
    let mut remaining = value;

    for i in 0..8 {
        bytes[7 - i] = (remaining & 0xff) as u8;
        remaining = remaining >> 8;
    }

    bytes
}

// Computes a deterministic nullifier from the signature
// Since signatures are deterministic (RFC 6979), same signer + message = same nullifier
pub fn compute_nullifier(signature: [u8; 64]) -> Field {
    // Convert signature bytes to Fields for Poseidon hashing
    // Split signature into 8-byte chunks to avoid overflow
    let mut sig_fields: [Field; 8] = [0; 8];

    for i in 0..8 {
        let mut chunk: Field = 0;
        for j in 0..8 {
            chunk = chunk * 256 + (signature[i * 8 + j] as Field);
        }
        sig_fields[i] = chunk as Field;
    }

    // Hash using Poseidon2
    poseidon2::Poseidon2::hash(sig_fields, 8)
}
