mod constants;
mod merkle_tree;

use crate::constants::MERKLE_TREE_SIZE;
use crate::merkle_tree::compute_merkle_root;

fn main(
    transfers_root_hash: pub Field,
    transfer_leaf: Field,
    merkle_proof: [Field; MERKLE_TREE_SIZE],
    is_even: [bool; MERKLE_TREE_SIZE],
) {
    let computed_root =
        compute_merkle_root::<MERKLE_TREE_SIZE>(transfer_leaf, merkle_proof, is_even);

    // Verify the computed root matches the expected root
    assert(computed_root == transfers_root_hash);
}

// #[test]
// fn test_main() {
//     main(1, 2);

//     // Uncomment to make test fail
//     // main(1, 1);
// }
