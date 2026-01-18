import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked, hexToBytes } from "viem";
import type { EtherscanERC20Transfer } from "../types/index.types";
import type { MerkleProof, MerkleTree } from "../scripts/merkleTree";
import type { Barretenberg } from "@aztec/bb.js";
import { bigIntToFr, frToBigInt } from "../scripts/encodingUtils";

export const chance = (p: number = 0.5) => {
  return Math.random() < p;
};

export const getRandomInt = (min: number, max: number) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateAccount = () => {
  const privateKey = generatePrivateKey();
  return privateKeyToAccount(privateKey);
};

export const generateEthereumAddress = () => {
  const account = generateAccount();
  return account.address;
};

export const generateRandomTransferAmount = (decimals: number = 18): string => {
  const base = BigInt(getRandomInt(1, 1_000_000));
  const multiplier = 10n ** BigInt(decimals);

  return (base * multiplier).toString();
};

export const generateRandomHex = (length: number): `0x${string}` => {
  const bytes = Array.from({ length: length / 2 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  ).join("");
  return `0x${bytes}`;
};

interface GetRandomTransferAmountParams {
  from?: string;
  to?: string;
  tokenAddress?: string;
}

export const generateTransfer = ({
  from,
  to,
  tokenAddress,
}: {
  from?: string;
  to?: string;
  tokenAddress?: string;
}): EtherscanERC20Transfer => {
  const now = Math.floor(Date.now() / 1000);
  const blockNumber = getRandomInt(10000000, 20000000);

  return {
    blockNumber: blockNumber.toString(),
    timeStamp: (now - getRandomInt(0, 86400)).toString(),
    hash: generateRandomHex(64),
    nonce: getRandomInt(0, 1000).toString(),
    blockHash: generateRandomHex(64),
    contractAddress: tokenAddress || generateEthereumAddress(),
    from: from || generateEthereumAddress(),
    to: to || generateEthereumAddress(),
    value: generateRandomTransferAmount(),
    tokenName: "Test Token",
    tokenSymbol: "TST",
    tokenDecimal: "18",
    transactionIndex: getRandomInt(0, 100).toString(),
    gas: getRandomInt(21000, 100000).toString(),
    gasPrice: (getRandomInt(1, 100) * 10 ** 9).toString(),
    gasUsed: getRandomInt(21000, 100000).toString(),
    cumulativeGasUsed: getRandomInt(100000, 10000000).toString(),
    input: "0xa9059cbb",
    methodId: "0xa9059cbb",
    functionName: "transfer(address _to, uint256 _value)",
    confirmations: getRandomInt(1, 1000).toString(),
  };
};

export const generateTransfers = (
  transferParams: GetRandomTransferAmountParams,
  amount: number = 1
): EtherscanERC20Transfer[] => {
  if (!amount) {
    amount = getRandomInt(1, 10);
  }

  return Array(amount)
    .fill(null)
    .map(() => generateTransfer(transferParams));
};

export const generateRandomTransfers = (
  amount: number = 1
): EtherscanERC20Transfer[] => {
  return Array(amount)
    .fill(null)
    .map(() =>
      generateTransfer({
        from: generateEthereumAddress(),
        to: generateEthereumAddress(),
        tokenAddress: generateEthereumAddress(),
      })
    );
};

interface ClaimConstraints {
  minTransfersSum: bigint;
  maxTransfersSum: bigint;
  fromBlockTimestamp: bigint;
  toBlockTimestamp: bigint;
}

export const getClaimConstraintsFromTransfer = (
  transfer: EtherscanERC20Transfer
): ClaimConstraints => {
  return {
    minTransfersSum: BigInt(transfer.value),
    maxTransfersSum: BigInt(transfer.value),
    fromBlockTimestamp: BigInt(transfer.timeStamp),
    toBlockTimestamp: BigInt(transfer.timeStamp),
  };
};

export const getClaimConstraintsFromTransfers = (
  transfers: EtherscanERC20Transfer[]
): ClaimConstraints => {
  let totalSum = 0n;
  let minTimestamp = BigInt(transfers[0].timeStamp);
  let maxTimestamp = BigInt(transfers[0].timeStamp);

  for (const transfer of transfers) {
    totalSum += BigInt(transfer.value);
    const timestamp = BigInt(transfer.timeStamp);

    if (timestamp < minTimestamp) {
      minTimestamp = timestamp;
    }

    if (timestamp > maxTimestamp) {
      maxTimestamp = timestamp;
    }
  }

  return {
    minTransfersSum: totalSum,
    maxTransfersSum: totalSum,
    fromBlockTimestamp: minTimestamp,
    toBlockTimestamp: maxTimestamp,
  };
};

export const shuffleArray = <T>(arr: T[]): T[] => {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
};

export const mergeAndShuffle = <T>(arr: T[], valuesToInsert: T[]): T[] => {
  const shuffledOriginalArray = shuffleArray(arr);
  const shuffledValuesToInsert = shuffleArray(valuesToInsert);

  return shuffleArray([...shuffledOriginalArray, ...shuffledValuesToInsert]);
};

export const uuidToBytes32 = (uuid: string): `0x${string}` => {
  const formattedClaimId = `${uuid.replace(/-/g, "")}`;

  return `0x${formattedClaimId.padStart(64, "0")}`;
};

export const addressToBytes32 = (address: string): `0x${string}` => {
  return `0x${address.slice(2).padStart(64, "0")}`;
};

export const bigintToBytes32 = (value: string | bigint): `0x${string}` => {
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
};

export interface CircuitTransfer {
  amount: string;
  block_timestamp: string;
  [key: string]: string;
}

export const createEmptyTransfer = (): CircuitTransfer => ({
  amount: "0",
  block_timestamp: "0",
});

export const mapToCircuitTransfer = (
  transfer: EtherscanERC20Transfer
): CircuitTransfer => ({
  amount: transfer.value,
  block_timestamp: transfer.timeStamp,
});

export const mapToCircuitTransfers = (
  transfers: EtherscanERC20Transfer[]
): CircuitTransfer[] => transfers.map(mapToCircuitTransfer);

export const createEmptyMerkleProof = (treeHeight: number): MerkleProof => ({
  root: "0",
  pathElements: Array(treeHeight).fill("0"),
  pathIndices: Array(treeHeight).fill(0),
  leaf: "0",
});

export const padTransfersArray = (
  transfers: CircuitTransfer[],
  maxLength: number
): CircuitTransfer[] => {
  if (transfers.length >= maxLength) {
    return transfers.slice(0, maxLength);
  }
  return [
    ...transfers,
    ...Array(maxLength - transfers.length)
      .fill(null)
      .map(() => createEmptyTransfer()),
  ];
};

export const padMerkleProofsArray = (
  proofs: MerkleProof[],
  maxLength: number,
  treeHeight: number
): MerkleProof[] => {
  if (proofs.length >= maxLength) {
    return proofs.slice(0, maxLength);
  }
  return [
    ...proofs,
    ...Array(maxLength - proofs.length)
      .fill(null)
      .map(() => createEmptyMerkleProof(treeHeight)),
  ];
};

export const findTransferIndices = (
  proverTransfers: EtherscanERC20Transfer[],
  allTransfers: EtherscanERC20Transfer[]
): number[] => {
  return proverTransfers.map((proverTransfer) => {
    return allTransfers
      .map((transfer, index) => ({ transfer, index }))
      .filter((item) => item.transfer.blockHash === proverTransfer.blockHash)
      .map((item) => item.index)[0];
  });
};

interface ClaimConstraints {
  minTransfersSum: bigint;
  maxTransfersSum: bigint;
  fromBlockTimestamp: bigint;
  toBlockTimestamp: bigint;
}

export const constructClaimMessage = (params: {
  claimIdBytes32: `0x${string}`;
  claimMessageHashBytes32: `0x${string}`;
  tokenAddressBytes32: `0x${string}`;
  userAddressBytes32: `0x${string}`;
  claimConstraints: ClaimConstraints;
  merkleTreeRootBytes32: `0x${string}`;
}): `0x${string}` => {
  const {
    claimIdBytes32,
    claimMessageHashBytes32,
    tokenAddressBytes32,
    userAddressBytes32,
    claimConstraints,
    merkleTreeRootBytes32,
  } = params;

  const messageBytes = encodePacked(
    [
      "bytes32",
      "bytes32",
      "bytes32",
      "bytes32",
      "uint128",
      "uint128",
      "uint64",
      "uint64",
      "bytes32",
    ],
    [
      claimIdBytes32,
      claimMessageHashBytes32,
      tokenAddressBytes32,
      userAddressBytes32,
      claimConstraints.minTransfersSum,
      claimConstraints.maxTransfersSum,
      claimConstraints.fromBlockTimestamp,
      claimConstraints.toBlockTimestamp,
      merkleTreeRootBytes32,
    ]
  );

  return keccak256(messageBytes);
};

export const processSignature = async (
  signature: `0x${string}`,
  barretenbergApi: Barretenberg
): Promise<{
  fullSignature: number[];
  nullifier: string;
}> => {
  const signatureBytes = hexToBytes(signature);
  const r = Array.from(signatureBytes.slice(0, 32));
  const s = Array.from(signatureBytes.slice(32, 64));
  const fullSignature = [...r, ...s];

  const sigFields: Uint8Array[] = [];
  for (let i = 0; i < 8; i++) {
    let chunk = 0n;
    for (let j = 0; j < 8; j++) {
      chunk = chunk * 256n + BigInt(fullSignature[i * 8 + j]);
    }
    sigFields.push(bigIntToFr(chunk));
  }

  const nullifierResult = await barretenbergApi.poseidon2Hash({
    inputs: sigFields,
  });
  const nullifier = frToBigInt(nullifierResult.hash).toString();

  return { fullSignature, nullifier };
};

export const extractPublicKeyComponents = (
  publicKey: `0x${string}`
): {
  pubKeyX: number[];
  pubKeyY: number[];
} => {
  const publicKeyBytes = hexToBytes(publicKey);
  const pubKeyX = Array.from(publicKeyBytes.slice(1, 33));
  const pubKeyY = Array.from(publicKeyBytes.slice(33, 65));

  return { pubKeyX, pubKeyY };
};

export const buildMerkleTreeWithTransfers = async (
  allTransfers: EtherscanERC20Transfer[],
  hashTransferFn: (
    transfer: Pick<
      EtherscanERC20Transfer,
      "from" | "to" | "contractAddress" | "value" | "timeStamp"
    >
  ) => Promise<Uint8Array>,
  merkleTreeZeroValuesStrArr: string[],
  poseidon2HashFn: (left: string, right: string) => Promise<string>,
  merkleTreeHeight: number,
  MerkleTreeClass: any
): Promise<MerkleTree> => {
  const allTransfersHashes = await Promise.all(
    allTransfers.map(hashTransferFn)
  );
  const allTransfersHashesStrArr = allTransfersHashes.map((item) =>
    frToBigInt(item).toString()
  );

  const merkleTree = new MerkleTreeClass(
    merkleTreeHeight,
    merkleTreeZeroValuesStrArr,
    poseidon2HashFn
  );

  await merkleTree.init(allTransfersHashesStrArr);

  return merkleTree;
};

export interface CircuitTestParams {
  proverTransfers: EtherscanERC20Transfer[];
  constraints: ClaimConstraints;
  allTransfers: EtherscanERC20Transfer[];
  prover: ReturnType<typeof generateAccount>;
  claimIdBytes32: `0x${string}`;
  claimMessageHashBytes32: `0x${string}`;
  tokenAddress: `0x${string}`;
  userAddress: `0x${string}`;
  tokenAddressBytes32: `0x${string}`;
  userAddressBytes32: `0x${string}`;
  merkleTreeZeroValuesStrArr: string[];
  poseidon2HashFn: (left: string, right: string) => Promise<string>;
  hashTransferFn: (
    transfer: Pick<
      EtherscanERC20Transfer,
      "from" | "to" | "contractAddress" | "value" | "timeStamp"
    >
  ) => Promise<Uint8Array>;
  barretenbergApi: Barretenberg;
  merkleTreeHeight: number;
  maxTransfers: number;
  MerkleTreeClass: any;
  nullifier?: string;
  signature?: `0x${string}`;
  publicKey?: `0x${string}`;
  transferProofs?: MerkleProof[];
}

export const buildCircuitInputs = async (
  params: CircuitTestParams
): Promise<{
  inputs: any;
  merkleTree: MerkleTree;
}> => {
  const {
    proverTransfers,
    constraints,
    allTransfers,
    prover,
    claimIdBytes32,
    claimMessageHashBytes32,
    tokenAddress,
    userAddress,
    tokenAddressBytes32,
    userAddressBytes32,
    merkleTreeZeroValuesStrArr,
    poseidon2HashFn,
    hashTransferFn,
    barretenbergApi,
    merkleTreeHeight,
    maxTransfers,
    MerkleTreeClass,
    nullifier,
    signature,
    publicKey,
    transferProofs,
  } = params;

  const merkleTree = await buildMerkleTreeWithTransfers(
    allTransfers,
    hashTransferFn,
    merkleTreeZeroValuesStrArr,
    poseidon2HashFn,
    merkleTreeHeight,
    MerkleTreeClass
  );

  const proverTransferIndices = findTransferIndices(
    proverTransfers,
    allTransfers
  );

  const proofs =
    transferProofs ||
    proverTransferIndices.map((index) => merkleTree.proof(index));

  const merkleTreeRoot = merkleTree.root();
  const merkleTreeRootBytes32 = bigintToBytes32(merkleTreeRoot);

  const hashedMessage = constructClaimMessage({
    claimIdBytes32,
    claimMessageHashBytes32,
    tokenAddressBytes32,
    userAddressBytes32,
    claimConstraints: constraints,
    merkleTreeRootBytes32,
  });

  const sig = signature || (await prover.sign({ hash: hashedMessage }));

  const { fullSignature, nullifier: computedNullifier } =
    await processSignature(sig, barretenbergApi);

  const finalNullifier = nullifier ?? computedNullifier;

  const pubKey = publicKey ?? prover.publicKey;
  const { pubKeyX, pubKeyY } = extractPublicKeyComponents(pubKey);

  const circuitTransfers = mapToCircuitTransfers(proverTransfers);
  const paddedTransfers = padTransfersArray(circuitTransfers, maxTransfers);
  const paddedProofs = padMerkleProofsArray(proofs, maxTransfers, merkleTreeHeight);

  const inputs = {
    claim_id: claimIdBytes32,
    claim_message_hash: claimMessageHashBytes32,
    token_address: tokenAddress,
    recipient_address: userAddress,
    min_transfers_sum: constraints.minTransfersSum.toString(),
    max_transfers_sum: constraints.maxTransfersSum.toString(),
    from_block_timestamp: constraints.fromBlockTimestamp.toString(),
    to_block_timestamp: constraints.toBlockTimestamp.toString(),
    transfers_root_hash: merkleTreeRoot,
    nullifier: finalNullifier,
    transfers: paddedTransfers,
    transfers_proofs: paddedProofs.map((p) => p.pathElements),
    are_transfer_leaves_even: paddedProofs.map((p) =>
      p.pathIndices.map((idx) => idx === 0)
    ),
    transfers_amount: circuitTransfers.length.toString(),
    prover_pub_key_x: pubKeyX,
    prover_pub_key_y: pubKeyY,
    prover_signature: fullSignature,
  };

  return { inputs, merkleTree };
};
