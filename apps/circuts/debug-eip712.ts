import { hashTypedData, keccak256, toHex, encodeAbiParameters, parseAbiParameters, concat } from 'viem';

// Test EIP-712 hash construction
const claimId = '0x1234567890123456789012345678901234567890123456789012345678901234';
const claimMessageHash = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const tokenAddress = '0x1111111111111111111111111111111111111111';
const recipientAddress = '0x2222222222222222222222222222222222222222';
const minTransfersSum = 1000n;
const maxTransfersSum = 5000n;
const fromBlockTimestamp = 1234567890n;
const toBlockTimestamp = 1234567999n;
const transfersRootHash = '0x9999999999999999999999999999999999999999999999999999999999999999';

const domain = {
  name: 'ProofOfTransfer',
  version: '1',
  chainId: BigInt(claimId),
  verifyingContract: '0x0000000000000000000000000000000000000000' as `0x${string}`,
} as const;

const types = {
  Claim: [
    { name: 'claimId', type: 'bytes32' },
    { name: 'claimMessageHash', type: 'bytes32' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'recipientAddress', type: 'address' },
    { name: 'minTransfersSum', type: 'uint128' },
    { name: 'maxTransfersSum', type: 'uint128' },
    { name: 'fromBlockTimestamp', type: 'uint64' },
    { name: 'toBlockTimestamp', type: 'uint64' },
    { name: 'transfersRootHash', type: 'bytes32' },
  ],
} as const;

const message = {
  claimId,
  claimMessageHash,
  tokenAddress,
  recipientAddress,
  minTransfersSum,
  maxTransfersSum,
  fromBlockTimestamp,
  toBlockTimestamp,
  transfersRootHash,
};

console.log('=== EIP-712 Hash Construction Debug ===\n');

// Compute typehashes
console.log('1. Typehashes:');
console.log('  DOMAIN_TYPEHASH:', keccak256(toHex('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')));
console.log('  CLAIM_TYPEHASH:', keccak256(toHex('Claim(bytes32 claimId,bytes32 claimMessageHash,address tokenAddress,address recipientAddress,uint128 minTransfersSum,uint128 maxTransfersSum,uint64 fromBlockTimestamp,uint64 toBlockTimestamp,bytes32 transfersRootHash)')));
console.log('  name_hash:', keccak256(toHex('ProofOfTransfer')));
console.log('  version_hash:', keccak256(toHex('1')));
console.log('');

// Compute domain separator manually
const domainTypehash = keccak256(toHex('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'));
const nameHash = keccak256(toHex('ProofOfTransfer'));
const versionHash = keccak256(toHex('1'));

const domainSeparatorManual = keccak256(
  encodeAbiParameters(
    parseAbiParameters('bytes32, bytes32, bytes32, uint256, address'),
    [domainTypehash, nameHash, versionHash, BigInt(claimId), '0x0000000000000000000000000000000000000000']
  )
);

console.log('2. Domain Separator (manual):', domainSeparatorManual);
console.log('');

// Compute struct hash manually
const claimTypehash = keccak256(toHex('Claim(bytes32 claimId,bytes32 claimMessageHash,address tokenAddress,address recipientAddress,uint128 minTransfersSum,uint128 maxTransfersSum,uint64 fromBlockTimestamp,uint64 toBlockTimestamp,bytes32 transfersRootHash)'));

const structHashManual = keccak256(
  encodeAbiParameters(
    parseAbiParameters('bytes32, bytes32, bytes32, address, address, uint128, uint128, uint64, uint64, bytes32'),
    [
      claimTypehash,
      claimId as `0x${string}`,
      claimMessageHash as `0x${string}`,
      tokenAddress,
      recipientAddress,
      minTransfersSum,
      maxTransfersSum,
      fromBlockTimestamp,
      toBlockTimestamp,
      transfersRootHash as `0x${string}`,
    ]
  )
);

console.log('3. Struct Hash (manual):', structHashManual);
console.log('');

// Compute final hash manually - should concatenate bytes directly, not use abi.encode
const finalHashManual = keccak256(
  concat(['0x1901', domainSeparatorManual, structHashManual])
);

console.log('4. Final EIP-712 Hash (manual):', finalHashManual);
console.log('');

// Compare with viem's hashTypedData
const hashFromViem = hashTypedData({
  domain,
  types,
  primaryType: 'Claim',
  message,
});

console.log('5. Hash from viem hashTypedData():', hashFromViem);
console.log('');

console.log('✓ Hashes match:', finalHashManual === hashFromViem);
