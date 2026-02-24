use dep::keccak256::keccak256;

use dep::circuit_noir::constants::{MAX_TRANSFERS, MERKLE_TREE_HEIGHT};
use dep::circuit_noir::transfer::Transfer;
use dep::circuit_noir::constraints::Constraints;
use dep::circuit_noir::identity::{ProverIdentity, verify_prover};
use dep::circuit_noir::validation::validate_transfers;
use dep::circuit_noir::utils::{u128_to_be_bytes, u64_to_be_bytes, u32_to_be_bytes};

struct ClaimInputs {
    claim_id: Field,
    claim_message_hash: Field,
    token_address: Field,
    counterparty_address: Field,
    is_prover_sender: bool,
    chain_id: Field,
    transfers_root_hash: Field,
    nullifier: Field,
}

fn main(
    // claim data (public)
    claim: pub ClaimInputs,
    constraints: pub Constraints,
    // private inputs
    transfers: [Transfer; MAX_TRANSFERS],
    transfers_proofs: [[Field; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    are_transfer_leaves_even: [[bool; MERKLE_TREE_HEIGHT]; MAX_TRANSFERS],
    transfers_amount: u32,
    // prover data
    prover: ProverIdentity,
) {
    let hashed_message = reconstruct_eip712_message(
        claim.claim_id,
        claim.claim_message_hash,
        claim.token_address,
        claim.counterparty_address,
        claim.is_prover_sender,
        claim.chain_id,
        constraints.min_transfers_sum,
        constraints.max_transfers_sum,
        constraints.min_transfers_count,
        constraints.max_transfers_count,
        constraints.from_block_timestamp,
        constraints.to_block_timestamp,
        claim.transfers_root_hash,
    );

    let prover_address = verify_prover(prover, hashed_message, claim.nullifier);

    validate_transfers(
        transfers,
        transfers_proofs,
        are_transfer_leaves_even,
        transfers_amount,
        prover_address,
        claim.counterparty_address,
        claim.is_prover_sender,
        claim.token_address,
        claim.transfers_root_hash,
        constraints,
    );
}

fn reconstruct_eip712_message(
    claim_id: Field,
    claim_message_hash: Field,
    token_address: Field,
    counterparty_address: Field,
    is_prover_sender: bool,
    chain_id: Field,
    min_transfers_sum: u128,
    max_transfers_sum: u128,
    min_transfers_count: u32,
    max_transfers_count: u32,
    from_block_timestamp: u64,
    to_block_timestamp: u64,
    transfers_root_hash: Field,
) -> [u8; 32] {
    // EIP-712 Domain Separator
    // DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
    let domain_typehash: [u8; 32] = [
        0x8b, 0x73, 0xc3, 0xc6, 0x9b, 0xb8, 0xfe, 0x3d, 0x51, 0x2e, 0xcc, 0x4c, 0xf7, 0x59, 0xcc,
        0x79, 0x23, 0x9f, 0x7b, 0x17, 0x9b, 0x0f, 0xfa, 0xca, 0xa9, 0xa7, 0x5d, 0x52, 0x2b, 0x39,
        0x40, 0x0f,
    ];

    // keccak256("ProofOfTransfer")
    let name_hash: [u8; 32] = [
        0x0c, 0x99, 0x64, 0xc3, 0xc2, 0xcc, 0xee, 0x6b, 0x16, 0x60, 0xd5, 0x44, 0xf5, 0x58, 0x11,
        0x93, 0xad, 0x45, 0x31, 0x17, 0xe3, 0x42, 0x86, 0xff, 0xd6, 0x2e, 0xee, 0x10, 0x6b, 0xa9,
        0xb7, 0x23,
    ];

    // keccak256("1")
    let version_hash: [u8; 32] = [
        0xc8, 0x9e, 0xfd, 0xaa, 0x54, 0xc0, 0xf2, 0x0c, 0x7a, 0xdf, 0x61, 0x28, 0x82, 0xdf, 0x09,
        0x50, 0xf5, 0xa9, 0x51, 0x63, 0x7e, 0x03, 0x07, 0xcd, 0xcb, 0x4c, 0x67, 0x2f, 0x29, 0x8b,
        0x8b, 0xc6,
    ];

    let chain_id_bytes = chain_id.to_be_bytes::<32>();
    let verifying_contract: [u8; 32] = [0; 32];

    // Domain separator: keccak256(abi.encode(DOMAIN_TYPEHASH, name_hash, version_hash, chainId, verifyingContract))
    let mut domain_data: [u8; 160] = [0; 160];
    for i in 0..32 {
        domain_data[i] = domain_typehash[i];
    }
    for i in 0..32 {
        domain_data[32 + i] = name_hash[i];
    }
    for i in 0..32 {
        domain_data[64 + i] = version_hash[i];
    }
    for i in 0..32 {
        domain_data[96 + i] = chain_id_bytes[i];
    }
    for i in 0..32 {
        domain_data[128 + i] = verifying_contract[i];
    }

    let domain_separator = keccak256(domain_data, 160);

    // CLAIM_TYPEHASH = keccak256("Claim(bytes32 claimId,bytes32 claimMessageHash,address tokenAddress,address counterpartyAddress,bool isProverSender,uint128 minTransfersSum,uint128 maxTransfersSum,uint32 minTransfersCount,uint32 maxTransfersCount,uint64 fromBlockTimestamp,uint64 toBlockTimestamp,bytes32 transfersRootHash)")
    let claim_typehash: [u8; 32] = [
        0xd1, 0x62, 0xc5, 0x7e, 0xae, 0xd8, 0x99, 0x75, 0x2f, 0x52, 0x08, 0x9b, 0x3d, 0x0a, 0xdc,
        0x6a, 0x79, 0xaf, 0xb7, 0x04, 0x8c, 0x5e, 0x07, 0x66, 0x16, 0x8f, 0xbf, 0x93, 0xf7, 0x5e,
        0x3a, 0xb8,
    ];

    let claim_id_bytes = claim_id.to_be_bytes::<32>();
    let claim_message_hash_bytes = claim_message_hash.to_be_bytes::<32>();
    let token_address_bytes = token_address.to_be_bytes::<32>();
    let counterparty_address_bytes = counterparty_address.to_be_bytes::<32>();
    let min_transfers_sum_bytes = u128_to_be_bytes(min_transfers_sum);
    let max_transfers_sum_bytes = u128_to_be_bytes(max_transfers_sum);
    let min_transfers_count_bytes = u32_to_be_bytes(min_transfers_count);
    let max_transfers_count_bytes = u32_to_be_bytes(max_transfers_count);
    let from_block_timestamp_bytes = u64_to_be_bytes(from_block_timestamp);
    let to_block_timestamp_bytes = u64_to_be_bytes(to_block_timestamp);
    let transfers_root_hash_bytes = transfers_root_hash.to_be_bytes::<32>();

    // Struct hash: keccak256(abi.encode(CLAIM_TYPEHASH, ...12 fields...))
    // 13 * 32 = 416 bytes
    let mut struct_data: [u8; 416] = [0; 416];

    // slot 0: typehash
    for i in 0..32 {
        struct_data[i] = claim_typehash[i];
    }
    // slot 1: claimId (bytes32)
    for i in 0..32 {
        struct_data[32 + i] = claim_id_bytes[i];
    }
    // slot 2: claimMessageHash (bytes32)
    for i in 0..32 {
        struct_data[64 + i] = claim_message_hash_bytes[i];
    }
    // slot 3: tokenAddress (address, left-padded)
    for i in 0..12 {
        struct_data[96 + i] = 0;
    }
    for i in 0..20 {
        struct_data[108 + i] = token_address_bytes[12 + i];
    }
    // slot 4: counterpartyAddress (address, left-padded)
    for i in 0..12 {
        struct_data[128 + i] = 0;
    }
    for i in 0..20 {
        struct_data[140 + i] = counterparty_address_bytes[12 + i];
    }
    // slot 5: isProverSender (bool, left-padded to 32 bytes)
    // All zeros except last byte = 1 if true
    for i in 0..31 {
        struct_data[160 + i] = 0;
    }
    struct_data[191] = if is_prover_sender { 1 } else { 0 };
    // slot 6: minTransfersSum (uint128, left-padded)
    for i in 0..16 {
        struct_data[192 + i] = 0;
    }
    for i in 0..16 {
        struct_data[208 + i] = min_transfers_sum_bytes[i];
    }
    // slot 7: maxTransfersSum (uint128, left-padded)
    for i in 0..16 {
        struct_data[224 + i] = 0;
    }
    for i in 0..16 {
        struct_data[240 + i] = max_transfers_sum_bytes[i];
    }
    // slot 8: minTransfersCount (uint32, left-padded)
    for i in 0..28 {
        struct_data[256 + i] = 0;
    }
    for i in 0..4 {
        struct_data[284 + i] = min_transfers_count_bytes[i];
    }
    // slot 9: maxTransfersCount (uint32, left-padded)
    for i in 0..28 {
        struct_data[288 + i] = 0;
    }
    for i in 0..4 {
        struct_data[316 + i] = max_transfers_count_bytes[i];
    }
    // slot 10: fromBlockTimestamp (uint64, left-padded)
    for i in 0..24 {
        struct_data[320 + i] = 0;
    }
    for i in 0..8 {
        struct_data[344 + i] = from_block_timestamp_bytes[i];
    }
    // slot 11: toBlockTimestamp (uint64, left-padded)
    for i in 0..24 {
        struct_data[352 + i] = 0;
    }
    for i in 0..8 {
        struct_data[376 + i] = to_block_timestamp_bytes[i];
    }
    // slot 12: transfersRootHash (bytes32)
    for i in 0..32 {
        struct_data[384 + i] = transfers_root_hash_bytes[i];
    }

    let struct_hash = keccak256(struct_data, 416);

    // Final EIP-712 hash = keccak256("\x19\x01" + domain_separator + struct_hash)
    let mut final_data: [u8; 66] = [0; 66];
    final_data[0] = 0x19;
    final_data[1] = 0x01;
    for i in 0..32 {
        final_data[2 + i] = domain_separator[i];
    }
    for i in 0..32 {
        final_data[34 + i] = struct_hash[i];
    }

    keccak256(final_data, 66)
}
