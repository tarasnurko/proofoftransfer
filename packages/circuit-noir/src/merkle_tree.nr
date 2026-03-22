use dep::poseidon::poseidon2;

pub fn compute_merkle_root<let N: u32>(
    leaf: Field,
    proof: [Field; N],
    is_even: [bool; N],
) -> Field {
    let mut current_hash: Field = leaf;

    for i in 0..N {
        let (left, right) = if is_even[i] {
            (current_hash, proof[i])
        } else {
            (proof[i], current_hash)
        };

        current_hash = poseidon2::Poseidon2::hash([left, right], 2);
    }

    current_hash
}
