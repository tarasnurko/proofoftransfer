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
    // Reconstruct the message that should have been signed
    // This prevents users from signing arbitrary messages
    let hashed_message = reconstruct_message(
        claim_id,
        claim_message_hash,
        token_address,
        recipient_address,
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

// Reconstructs the message hash from public parameters
// This enforces that users must sign a specific message format
fn reconstruct_message(
    claim_id: Field,
    claim_message_hash: Field,
    token_address: Field,
    recipient_address: Field,
    min_transfers_sum: u128,
    max_transfers_sum: u128,
    from_block_timestamp: u64,
    to_block_timestamp: u64,
    transfers_root_hash: Field,
) -> [u8; 32] {
    // Convert all parameters to bytes
    let claim_id_bytes = claim_id.to_be_bytes::<32>();
    let claim_message_hash_bytes = claim_message_hash.to_be_bytes::<32>();
    let token_address_bytes = token_address.to_be_bytes::<32>();
    let recipient_address_bytes = recipient_address.to_be_bytes::<32>();
    let min_transfers_sum_bytes = u128_to_be_bytes(min_transfers_sum);
    let max_transfers_sum_bytes = u128_to_be_bytes(max_transfers_sum);
    let from_block_timestamp_bytes = u64_to_be_bytes(from_block_timestamp);
    let to_block_timestamp_bytes = u64_to_be_bytes(to_block_timestamp);
    let transfers_root_hash_bytes = transfers_root_hash.to_be_bytes::<32>();

    // Concatenate all bytes: 32+32+32+32+16+16+8+8+32 = 208 bytes total
    let mut message_bytes: [u8; 208] = [0; 208];

    for i in 0..32 {
        message_bytes[i] = claim_id_bytes[i];
    }
    for i in 0..32 {
        message_bytes[32 + i] = claim_message_hash_bytes[i];
    }
    for i in 0..32 {
        message_bytes[64 + i] = token_address_bytes[i];
    }
    for i in 0..32 {
        message_bytes[96 + i] = recipient_address_bytes[i];
    }
    for i in 0..16 {
        message_bytes[128 + i] = min_transfers_sum_bytes[i];
    }
    for i in 0..16 {
        message_bytes[144 + i] = max_transfers_sum_bytes[i];
    }
    for i in 0..8 {
        message_bytes[160 + i] = from_block_timestamp_bytes[i];
    }
    for i in 0..8 {
        message_bytes[168 + i] = to_block_timestamp_bytes[i];
    }
    for i in 0..32 {
        message_bytes[176 + i] = transfers_root_hash_bytes[i];
    }

    // Hash the concatenated bytes
    keccak256(message_bytes, 208)
}

// #[test]
// fn test_main() {
//     main(1, 2);

//     // Uncomment to make test fail
//     // main(1, 1);
// }
