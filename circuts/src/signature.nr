use dep::std::ecdsa_secp256k1;
use dep::keccak256::keccak256;

// Verify ECDSA signature and that it corresponds to the expected Ethereum address
// This proves:
// 1. The prover controls the private key for the public key
// 2. The proof is bound to the specific message
// 3. The public key corresponds to the expected Ethereum address
pub fn verify_signature_and_address(
    pub_key_x: [u8; 32],
    pub_key_y: [u8; 32],
    signature: [u8; 64],
    message_hash: [u8; 32],
    expected_address: Field
) -> bool {
    // Step 1: Verify the ECDSA signature
    let signature_valid = ecdsa_secp256k1::verify_signature(
        pub_key_x,
        pub_key_y,
        signature,
        message_hash
    );

    // Step 2: Derive Ethereum address from public key
    // Ethereum address = last 20 bytes of keccak256(pub_key_x || pub_key_y)
    let mut pub_key: [u8; 64] = [0; 64];
    for i in 0..32 {
        pub_key[i] = pub_key_x[i];
        pub_key[32 + i] = pub_key_y[i];
    }

    // Hash the public key
    let pub_key_hash: [u8; 32] = keccak256(pub_key, 64);

    // Extract last 20 bytes as Ethereum address
    let mut address_bytes: [u8; 20] = [0; 20];
    for i in 0..20 {
        address_bytes[i] = pub_key_hash[12 + i];
    }

    // Convert address bytes to Field
    let derived_address = address_bytes_to_field(address_bytes);

    // Step 3: Verify both signature and address match
    signature_valid & (derived_address == expected_address)
}

// Helper function to convert Ethereum address bytes to Field
fn address_bytes_to_field(address: [u8; 20]) -> Field {
    let mut result: Field = 0;
    for i in 0..20 {
        result = result * 256 + address[i] as Field;
    }
    result
}
