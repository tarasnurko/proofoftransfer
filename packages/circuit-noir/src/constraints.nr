pub struct Constraints {
    pub min_transfers_sum: u128,
    pub max_transfers_sum: u128,
    pub min_transfers_count: u32,
    pub max_transfers_count: u32,
    pub from_block_timestamp: u64,
    pub to_block_timestamp: u64,
}

pub fn check_sum_constraints(sum: u128, min: u128, max: u128) {
    assert(
        (min == 0) | (sum >= min),
        f"Transfers sum {sum} is below required minimum {min}",
    );
    assert(
        (max == 0) | (sum <= max),
        f"Transfers sum {sum} exceeds required maximum {max}",
    );
}

pub fn check_count_constraint(count: u32, min_count: u32, max_count: u32) {
    assert(
        (min_count == 0) | (count >= min_count),
        f"Transfers count {count} is below required minimum {min_count}",
    );
    assert(
        (max_count == 0) | (count <= max_count),
        f"Transfers count {count} exceeds required maximum {max_count}",
    );
}
