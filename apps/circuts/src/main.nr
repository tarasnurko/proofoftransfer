mod constants;
mod merkle_tree;
mod utils;

use dep::keccak256::keccak256;
use dep::poseidon::poseidon2;

use crate::constants::{MAX_TRANSFERS, MERKLE_TREE_HEIGHT};
use crate::merkle_tree::compute_merkle_root;
use crate::utils::{compute_nullifier, u128_to_be_bytes, u64_to_be_bytes};

struct Transfer {
    amount: u128,
    block_timestamp: u64,
}

/**
* @param claim_id - id of claim created by user in web app.
* @param claim_message_hash - poseidon2 hash of claim message. 
* @param token_address - address of token in which transfer(s) was/were made
* @param recipient_address - address of transfer(s) recipient
* @param min_transfers_sum - 
* @param max_transfers_sum - 
* @param from_block_timestamp - minimum block timestamp in which every transfer is made (including)
* @param to_block_timestamp - maximum block timestamp in which every transfer is made (including)
* @param transfers_root_hash - merkle tree root (poseidon2) of every transfer that satisfies claim data
* @param nullifier - value that prevents proof reuse. Hash of user signature for proving transfer(s). For claim user will always generate same signature (because parameters are the same), and if there is 2 or more proofs with same nullifier, then we know user wanted to reuse his transfer proof (for example to send to other user that didnt do transfer, so they can provide proof that thay "did" transfer).
* @param transfers - user transfers
* @param transfers_proofs - 
* @param are_transfer_leaves_even - 
* @param transfers_amount - 
*/
fn main(
    // claim data (public)
    claim_id: pub Field,
    claim_message_hash: pub Field,
    token_address: pub Field,
    recipient_address: pub Field,
    chain_id: pub Field,
    // claim transfer constraints
    min_transfers_sum: pub u128,
    max_transfers_sum: pub u128,
    from_block_timestamp: pub u64,
    to_block_timestamp: pub u64,
    // merkle tree
    transfers_root_hash: pub Field,
    // nullifier - prevents proof reuse
    nullifier: pub Field,
    // private inputs
    transfers: [Transfer; MAX_TRANSFERS],
    transfers_proofs: [[Field; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    are_transfer_leaves_even: [[bool; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    transfers_amount: u32,
    // proover data
    prover_pub_key_x: [u8; 32],
    prover_pub_key_y: [u8; 32],
    prover_signature: [u8; 64],
) {
    // Reconstruct the EIP-712 typed data message that should have been signed
    // This prevents users from signing arbitrary messages
    let hashed_message = reconstruct_eip712_message(
        claim_id,
        claim_message_hash,
        token_address,
        recipient_address,
        chain_id,
        min_transfers_sum,
        max_transfers_sum,
        from_block_timestamp,
        to_block_timestamp,
        transfers_root_hash,
    );

    let sender_address = ecrecover::ecrecover(
        prover_pub_key_x,
        prover_pub_key_y,
        prover_signature,
        hashed_message,
    );

    let computed_nullifier = compute_nullifier(prover_signature);

    assert(
        computed_nullifier == nullifier,
        f"Nullifier mismatch: expected {nullifier}, computed {computed_nullifier}",
    );
    assert(
        transfers_amount <= MAX_TRANSFERS,
        f"Transfers amount ({transfers_amount}) exceeds MAX_TRANSFERS {MAX_TRANSFERS}",
    );

    let mut transfers_sum: u128 = 0;

    for i in 0..MAX_TRANSFERS {
        if i < transfers_amount {
            let transfer = transfers[i];
            let transfer_block_timestamp = transfer.block_timestamp;

            transfers_sum += transfer.amount;

            assert(
                (from_block_timestamp == 0) | (transfer_block_timestamp >= from_block_timestamp),
                f"Transfer {i} timestamp {transfer_block_timestamp} is before required minimum {from_block_timestamp}",
            );
            assert(
                (to_block_timestamp == 0) | (transfer_block_timestamp <= to_block_timestamp),
                f"Transfer {i} timestamp {transfer_block_timestamp} is after required maximum {to_block_timestamp}",
            );

            let transfer_hash = hash_transfer(
                sender_address,
                recipient_address,
                token_address,
                transfer.amount,
                transfer.block_timestamp,
            );

            let transfer_proofs = transfers_proofs[i];

            let computed_transfers_root = compute_merkle_root::<MERKLE_TREE_HEIGHT>(
                transfer_hash,
                transfer_proofs,
                are_transfer_leaves_even[i],
            );

            assert(
                computed_transfers_root == transfers_root_hash,
                f"Transfer {i} merkle proof invalid: computed root {computed_transfers_root} != expected root {transfers_root_hash}",
            )
        }
    }

    assert(
        (min_transfers_sum == 0) | (transfers_sum >= min_transfers_sum),
        f"Transfers sum {transfers_sum} is below required minimum {min_transfers_sum}",
    );
    assert(
        (max_transfers_sum == 0) | (transfers_sum <= max_transfers_sum),
        f"Transfers sum {transfers_sum} exceeds required maximum {max_transfers_sum}",
    );
}

fn hash_transfer(
    from: Field,
    to: Field,
    token_address: Field,
    amount: u128,
    block_timestamp: u64,
) -> Field {
    poseidon2::Poseidon2::hash(
        [from, to, token_address, amount as Field, block_timestamp as Field],
        5,
    )
}

// Reconstructs the EIP-712 typed data hash from public parameters
// This enforces that users must sign the specific EIP-712 format
fn reconstruct_eip712_message(
    claim_id: Field,
    claim_message_hash: Field,
    token_address: Field,
    recipient_address: Field,
    chain_id: Field,
    min_transfers_sum: u128,
    max_transfers_sum: u128,
    from_block_timestamp: u64,
    to_block_timestamp: u64,
    transfers_root_hash: Field,
) -> [u8; 32] {
    // EIP-712 Domain Separator
    // DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    let domain_typehash: [u8; 32] = [
        0x8b, 0x73, 0xc3, 0xc6, 0x9b, 0xb8, 0xfe, 0x3d, 0x51, 0x2e, 0xcc, 0x4c, 0xf7, 0x59, 0xcc, 0x79,
        0x23, 0x9f, 0x7b, 0x17, 0x9b, 0x0f, 0xfa, 0xca, 0xa9, 0xa7, 0x5d, 0x52, 0x2b, 0x39, 0x40, 0x0f
    ];

    // keccak256("ProofOfTransfer")
    let name_hash: [u8; 32] = [
        0x0c, 0x99, 0x64, 0xc3, 0xc2, 0xcc, 0xee, 0x6b, 0x16, 0x60, 0xd5, 0x44, 0xf5, 0x58, 0x11, 0x93,
        0xad, 0x45, 0x31, 0x17, 0xe3, 0x42, 0x86, 0xff, 0xd6, 0x2e, 0xee, 0x10, 0x6b, 0xa9, 0xb7, 0x23
    ];

    // keccak256("1")
    let version_hash: [u8; 32] = [
        0xc8, 0x9e, 0xfd, 0xaa, 0x54, 0xc0, 0xf2, 0x0c, 0x7a, 0xdf, 0x61, 0x28, 0x82, 0xdf, 0x09, 0x50,
        0xf5, 0xa9, 0x51, 0x63, 0x7e, 0x03, 0x07, 0xcd, 0xcb, 0x4c, 0x67, 0x2f, 0x29, 0x8b, 0x8b, 0xc6
    ];

    // chainId from wallet (e.g., 1 for Ethereum mainnet)
    let chain_id_bytes = chain_id.to_be_bytes::<32>();

    // verifyingContract = 0x0000000000000000000000000000000000000000
    let verifying_contract: [u8; 32] = [0; 32];

    // Encode domain separator = keccak256(abi.encode(DOMAIN_TYPEHASH, name_hash, version_hash, chainId, verifyingContract))
    // abi.encode pads each field to 32 bytes, so total is 32*5 = 160 bytes
    let mut domain_data: [u8; 160] = [0; 160];
    for i in 0..32 { domain_data[i] = domain_typehash[i]; }
    for i in 0..32 { domain_data[32 + i] = name_hash[i]; }
    for i in 0..32 { domain_data[64 + i] = version_hash[i]; }
    for i in 0..32 { domain_data[96 + i] = chain_id_bytes[i]; }
    for i in 0..32 { domain_data[128 + i] = verifying_contract[i]; }

    let domain_separator = keccak256(domain_data, 160);

    // EIP-712 Struct Hash
    // CLAIM_TYPEHASH = keccak256("Claim(bytes32 claimId,bytes32 claimMessageHash,address tokenAddress,address recipientAddress,uint128 minTransfersSum,uint128 maxTransfersSum,uint64 fromBlockTimestamp,uint64 toBlockTimestamp,bytes32 transfersRootHash)")
    let claim_typehash: [u8; 32] = [
        0xd7, 0x3d, 0x50, 0xc6, 0x22, 0x66, 0x87, 0x80, 0xba, 0x96, 0xa7, 0xfa, 0x41, 0x1e, 0xca, 0xb0,
        0xa4, 0x99, 0x55, 0x01, 0x26, 0x52, 0xdf, 0x06, 0xcc, 0x4c, 0xca, 0xc2, 0xb1, 0x3d, 0x4c, 0x54
    ];

    // Convert all parameters to bytes
    let claim_id_bytes_param = claim_id.to_be_bytes::<32>();
    let claim_message_hash_bytes = claim_message_hash.to_be_bytes::<32>();
    let token_address_bytes = token_address.to_be_bytes::<32>();
    let recipient_address_bytes = recipient_address.to_be_bytes::<32>();
    let min_transfers_sum_bytes = u128_to_be_bytes(min_transfers_sum);
    let max_transfers_sum_bytes = u128_to_be_bytes(max_transfers_sum);
    let from_block_timestamp_bytes = u64_to_be_bytes(from_block_timestamp);
    let to_block_timestamp_bytes = u64_to_be_bytes(to_block_timestamp);
    let transfers_root_hash_bytes = transfers_root_hash.to_be_bytes::<32>();

    // Encode struct hash = keccak256(abi.encode(CLAIM_TYPEHASH, ...all fields...))
    // abi.encode pads each field to 32 bytes, so total is 32*10 = 320 bytes
    let mut struct_data: [u8; 320] = [0; 320];
    for i in 0..32 { struct_data[i] = claim_typehash[i]; }
    for i in 0..32 { struct_data[32 + i] = claim_id_bytes_param[i]; }
    for i in 0..32 { struct_data[64 + i] = claim_message_hash_bytes[i]; }
    // For address fields, pad to 32 bytes (addresses are 20 bytes, left-padded with zeros in the last 20 bytes)
    for i in 0..12 { struct_data[96 + i] = 0; }
    for i in 0..20 { struct_data[108 + i] = token_address_bytes[12 + i]; }
    for i in 0..12 { struct_data[128 + i] = 0; }
    for i in 0..20 { struct_data[140 + i] = recipient_address_bytes[12 + i]; }
    // For uint128, pad to 32 bytes (u128 is 16 bytes, left-padded with zeros)
    for i in 0..16 { struct_data[160 + i] = 0; }
    for i in 0..16 { struct_data[176 + i] = min_transfers_sum_bytes[i]; }
    for i in 0..16 { struct_data[192 + i] = 0; }
    for i in 0..16 { struct_data[208 + i] = max_transfers_sum_bytes[i]; }
    // For uint64, pad to 32 bytes (u64 is 8 bytes, left-padded with zeros)
    for i in 0..24 { struct_data[224 + i] = 0; }
    for i in 0..8 { struct_data[248 + i] = from_block_timestamp_bytes[i]; }
    for i in 0..24 { struct_data[256 + i] = 0; }
    for i in 0..8 { struct_data[280 + i] = to_block_timestamp_bytes[i]; }
    // bytes32 fields are already 32 bytes
    for i in 0..32 { struct_data[288 + i] = transfers_root_hash_bytes[i]; }

    let struct_hash = keccak256(struct_data, 320);

    // Final EIP-712 hash = keccak256("\x19\x01" + domain_separator + struct_hash)
    // Total: 2 + 32 + 32 = 66 bytes
    let mut final_data: [u8; 66] = [0; 66];
    final_data[0] = 0x19;
    final_data[1] = 0x01;
    for i in 0..32 { final_data[2 + i] = domain_separator[i]; }
    for i in 0..32 { final_data[34 + i] = struct_hash[i]; }

    keccak256(final_data, 66)
}

// #[test]
// fn test_main() {
//     main(1, 2);

//     // Uncomment to make test fail
//     // main(1, 1);
// }
