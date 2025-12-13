use crate::types::{Transfer, MAX_TRANSFERS};

// Sum amounts from valid transfers only
pub fn sum_transfer_amounts(transfers: [Transfer; MAX_TRANSFERS]) -> Field {
    let mut total: Field = 0;

    for i in 0..MAX_TRANSFERS {
        if transfers[i].is_valid {
            total += transfers[i].amount;
        }
    }

    total
}

// Assert amount is within range [min, max]
// Note: In Noir, we use assertions rather than returning bool for range checks
pub fn assert_amount_range(amount: Field, min: Field, max: Field) {
    // Convert to u128 for comparison (assuming token amounts fit in u128)
    let amount_u128 = amount as u128;
    let min_u128 = min as u128;
    let max_u128 = max as u128;

    assert(amount_u128 >= min_u128, "Amount below minimum");
    assert(amount_u128 <= max_u128, "Amount above maximum");
}

// Assert all timestamps are within date range
pub fn assert_timestamp_range(
    transfers: [Transfer; MAX_TRANSFERS],
    start_date: Field,
    end_date: Field
) {
    for i in 0..MAX_TRANSFERS {
        if transfers[i].is_valid {
            let ts_u64 = transfers[i].timestamp as u64;
            let start_u64 = start_date as u64;
            let end_u64 = end_date as u64;

            assert(ts_u64 >= start_u64, "Timestamp before start date");
            assert(ts_u64 <= end_u64, "Timestamp after end date");
        }
    }
}
