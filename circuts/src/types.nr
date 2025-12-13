// Circuit configuration constants
pub global MERKLE_DEPTH: u32 = 20;     // Support up to 2^20 = ~1M transfers
pub global MAX_TRANSFERS: u32 = 50;    // Compile-time parameter (adjustable)

// Represents a single ERC20 transfer
pub struct Transfer {
    pub amount: Field,                           // Transfer amount (private)
    pub timestamp: Field,                        // Unix timestamp (private)
    pub tx_hash: [u8; 32],                      // Transaction hash (private)
    pub merkle_path: [Field; MERKLE_DEPTH],     // Merkle proof siblings (private)
    pub path_indices: [Field; MERKLE_DEPTH],    // Path direction (0=left, 1=right) (private)
    pub is_valid: bool,                         // Flag to handle variable length (private)
}

// Public inputs to the circuit
pub struct PublicInputs {
    pub global_transfers_root: Field,    // Merkle root of all transfers
    pub addr_commit: Field,              // Commitment to sender address
    pub token_address: Field,            // ERC20 token address
    pub receiver_address: Field,         // Recipient address
    pub start_date: Field,               // Start of date range (Unix timestamp)
    pub end_date: Field,                 // End of date range (Unix timestamp)
    pub min_amount: Field,               // Minimum total amount
    pub max_amount: Field,               // Maximum total amount
    pub message_hash: [u8; 32],         // Hash of the message being signed
}

// Private witness data
pub struct PrivateWitness {
    pub sender_address: Field,                   // Prover's Ethereum address (160-bit)
    pub salt: Field,                             // Salt for address commitment
    pub pub_key_x: [u8; 32],                    // Public key x-coordinate
    pub pub_key_y: [u8; 32],                    // Public key y-coordinate
    pub signature: [u8; 64],                    // ECDSA signature of message_hash
    pub transfers: [Transfer; MAX_TRANSFERS],   // Array of transfers
}

// Helper function to convert Field to bytes
pub fn field_to_bytes_32(field: Field) -> [u8; 32] {
    field.to_be_bytes()
}

// Helper function to convert bytes to Field
pub fn field_from_bytes_32(bytes: [u8; 32]) -> Field {
    let mut result: Field = 0;
    for i in 0..32 {
        result = result * 256 + bytes[i] as Field;
    }
    result
}
