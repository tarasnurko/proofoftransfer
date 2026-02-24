use dep::poseidon::poseidon2;

pub struct Transfer {
    pub amount: u128,
    pub block_timestamp: u64,
    pub tx_hash: Field,
}

pub fn hash_transfer(
    from: Field,
    to: Field,
    token_address: Field,
    amount: u128,
    block_timestamp: u64,
    tx_hash: Field,
) -> Field {
    poseidon2::Poseidon2::hash(
        [from, to, token_address, amount as Field, block_timestamp as Field, tx_hash],
        6,
    )
}
