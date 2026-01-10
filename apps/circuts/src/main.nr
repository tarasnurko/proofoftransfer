mod constants;
mod merkle_tree;

use dep::poseidon::poseidon2;

use crate::constants::{MAX_TRANSFERS, MERKLE_TREE_HEIGHT};
use crate::merkle_tree::compute_merkle_root;

struct Transfer {
    amount: u128,
    block_timestamp: u64,
}

// impl Transfer {
//     fn hash(self) -> Field {
//         poseidon2::Poseidon2::hash([self.amount as Field, self.block_timestamp as Field], 2)
//     }
// }

fn main(
    sender_address: Field,
    token_address: pub Field,
    recipient_address: pub Field,
    // constraints
    min_transfer_sum: pub u128,
    max_transfer_sum: pub u128,
    from_block_timestamp: pub u64,
    to_block_timestamp: pub u64,
    // merkle tree
    transfers_root_hash: pub Field,
    transfers: [Transfer; MAX_TRANSFERS],
    transfers_proofs: [[Field; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    are_transfer_leaves_even: [[bool; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    transfers_amount: u32,
) {
    assert(transfers_amount <= MAX_TRANSFERS, "transfers_amount exceeds MAX_TRANSFERS");

    let mut transfers_sum: u128 = 0;

    for i in 0..MAX_TRANSFERS {
        if i < transfers_amount {
            let transfer = transfers[i];
            let transfer_block_timestamp = transfer.block_timestamp;

            transfers_sum += transfer.amount;

            assert(
                (from_block_timestamp == 0) | (transfer_block_timestamp >= from_block_timestamp),
                f"Transfer {i} fails from block timestamp validation ({transfer_block_timestamp} (transfer timestamp) >= {from_block_timestamp} (from timestamp))",
            );
            assert((to_block_timestamp == 0) | (transfer_block_timestamp <= to_block_timestamp));

            let transfer_hash =
                hash_transfer(transfer, token_address, sender_address, recipient_address);

            let transfer_proofs = transfers_proofs[i];

            let computed_transfers_root = compute_merkle_root::<MERKLE_TREE_HEIGHT>(
                transfer_hash,
                transfer_proofs,
                are_transfer_leaves_even[i],
            );

            assert(
                computed_transfers_root == transfers_root_hash,
                f"Computed transfers root hash is different from actual for transfer {i}",
            )
        }
    }

    assert((min_transfer_sum == 0) | (transfers_sum >= min_transfer_sum));
    assert((max_transfer_sum == 0) | (transfers_sum <= max_transfer_sum));
}

fn hash_transfer(
    transfer: Transfer,
    token_address: Field,
    sender_address: Field,
    recipient_address: Field,
) -> Field {
    poseidon2::Poseidon2::hash(
        [
            sender_address,
            recipient_address,
            token_address,
            transfer.amount as Field,
            transfer.block_timestamp as Field,
        ],
        5,
    )
}

// #[test]
// fn test_main() {
//     main(1, 2);

//     // Uncomment to make test fail
//     // main(1, 1);
// }
