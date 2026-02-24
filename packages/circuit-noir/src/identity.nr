use crate::utils::compute_nullifier;

pub struct ProverIdentity {
    pub pub_key_x: [u8; 32],
    pub pub_key_y: [u8; 32],
    pub signature: [u8; 64],
}

pub fn verify_prover(
    prover: ProverIdentity,
    message_hash: [u8; 32],
    expected_nullifier: Field,
) -> Field {
    let addr = ecrecover::ecrecover(
        prover.pub_key_x,
        prover.pub_key_y,
        prover.signature,
        message_hash,
    );

    let nullifier = compute_nullifier(prover.signature);
    assert(
        nullifier == expected_nullifier,
        f"Nullifier mismatch: expected {expected_nullifier}, computed {nullifier}",
    );

    addr
}
