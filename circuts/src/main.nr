mod types;
mod address;
mod signature;
mod merkle;
mod amount;

use types::{PublicInputs, PrivateWitness, MAX_TRANSFERS};

fn main(
    // Public inputs
    pub_inputs: pub PublicInputs,

    // Private witnesses
    priv_witness: PrivateWitness
) {
    // ===== 1. VERIFY ADDRESS COMMITMENT =====
    // Proves: Hash(sender_address, salt) == addr_commit
    let addr_commitment_valid = address::verify_address_commitment(
        priv_witness.sender_address,
        priv_witness.salt,
        pub_inputs.addr_commit
    );
    assert(addr_commitment_valid, "Address commitment verification failed");

    // ===== 2. VERIFY ADDRESS OWNERSHIP =====
    // Proves: ecrecover(Hash(message), signature) == sender_address
    // This binds the proof to the message and proves key ownership
    let signature_valid = signature::verify_signature_and_address(
        priv_witness.pub_key_x,
        priv_witness.pub_key_y,
        priv_witness.signature,
        pub_inputs.message_hash,
        priv_witness.sender_address
    );
    assert(signature_valid, "Signature verification failed");

    // ===== 3. VERIFY EACH TRANSFER =====
    for i in 0..MAX_TRANSFERS {
        let transfer = priv_witness.transfers[i];

        // Only verify valid transfers
        if transfer.is_valid {
            // Compute the leaf hash for this transfer
            let leaf = merkle::compute_transfer_leaf(
                priv_witness.sender_address,
                pub_inputs.receiver_address,
                pub_inputs.token_address,
                transfer.amount,
                transfer.timestamp,
                transfer.tx_hash
            );

            // Verify Merkle inclusion proof
            let merkle_valid = merkle::verify_merkle_proof(
                leaf,
                transfer.merkle_path,
                transfer.path_indices,
                pub_inputs.global_transfers_root
            );
            assert(merkle_valid, "Merkle proof verification failed");

            // Verify timestamp is within date range
            let ts_u64 = transfer.timestamp as u64;
            let start_u64 = pub_inputs.start_date as u64;
            let end_u64 = pub_inputs.end_date as u64;
            assert(ts_u64 >= start_u64, "Timestamp before start date");
            assert(ts_u64 <= end_u64, "Timestamp after end date");
        }
    }

    // ===== 4. VERIFY AMOUNT CONSTRAINTS =====
    let total_amount = amount::sum_transfer_amounts(priv_witness.transfers);
    amount::assert_amount_range(
        total_amount,
        pub_inputs.min_amount,
        pub_inputs.max_amount
    );

    // ===== 5. VERIFY AT LEAST ONE TRANSFER =====
    // Ensure the prover actually provided transfers
    let mut has_transfers = false;
    for i in 0..MAX_TRANSFERS {
        if priv_witness.transfers[i].is_valid {
            has_transfers = true;
        }
    }
    assert(has_transfers, "No valid transfers provided");
}
