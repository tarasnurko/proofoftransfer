use crate::constants::{MAX_TRANSFERS, MERKLE_TREE_HEIGHT};
use crate::merkle_tree::compute_merkle_root;
use crate::transfer::{Transfer, hash_transfer};
use crate::constraints::{Constraints, check_sum_constraints, check_count_constraint};

pub fn validate_transfers(
    transfers: [Transfer; MAX_TRANSFERS],
    transfers_proofs: [[Field; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    are_transfer_leaves_even: [[bool; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    transfers_amount: u32,
    prover_address: Field,
    counterparty_address: Field,
    is_prover_sender: bool,
    token_address: Field,
    expected_root: Field,
    constraints: Constraints,
) {
    assert(
        transfers_amount <= MAX_TRANSFERS,
        f"Transfers amount ({transfers_amount}) exceeds MAX_TRANSFERS {MAX_TRANSFERS}",
    );

    let mut transfers_sum: u128 = 0;

    let from_ts = constraints.from_block_timestamp;
    let to_ts = constraints.to_block_timestamp;

    // Determine from/to based on prover role
    let (from, to) = if is_prover_sender {
        (prover_address, counterparty_address)
    } else {
        (counterparty_address, prover_address)
    };

    for i in 0..MAX_TRANSFERS {
        if i < transfers_amount {
            let transfer = transfers[i];
            let transfer_block_timestamp = transfer.block_timestamp;

            transfers_sum += transfer.amount;

            assert(
                (from_ts == 0) | (transfer_block_timestamp >= from_ts),
                f"Transfer {i} timestamp {transfer_block_timestamp} is before required minimum {from_ts}",
            );
            assert(
                (to_ts == 0) | (transfer_block_timestamp <= to_ts),
                f"Transfer {i} timestamp {transfer_block_timestamp} is after required maximum {to_ts}",
            );

            let transfer_hash = hash_transfer(
                from,
                to,
                token_address,
                transfer.amount,
                transfer.block_timestamp,
                transfer.tx_hash,
            );

            let computed_transfers_root = compute_merkle_root::<MERKLE_TREE_HEIGHT>(
                transfer_hash,
                transfers_proofs[i],
                are_transfer_leaves_even[i],
            );

            assert(
                computed_transfers_root == expected_root,
                f"Transfer {i} merkle proof invalid: computed root {computed_transfers_root} != expected root {expected_root}",
            );
        }
    }

    check_sum_constraints(
        transfers_sum,
        constraints.min_transfers_sum,
        constraints.max_transfers_sum,
    );
    check_count_constraint(
        transfers_amount,
        constraints.min_transfers_count,
        constraints.max_transfers_count,
    );
}
