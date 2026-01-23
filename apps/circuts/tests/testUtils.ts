import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { EtherscanERC20Transfer } from "@repo/types";
import type { Barretenberg } from "@aztec/bb.js";
import type { InputMap } from "@noir-lang/noir_js";

import {
  type MerkleProof,
  type ClaimConstraints,
  MerkleTree,
  fieldToBigint,
  bigintToBytes32,
  mapToCircuitTransfers,
  padTransfersArray,
  padMerkleProofsArray,
  constructClaimMessage,
  processSignature,
  extractPublicKeyComponents,
} from "@repo/circuit-utils";

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
      .padStart(2, "0"),
  ).join("");
  return `0x${bytes}`;
};

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
  transferParams: { from?: string; to?: string; tokenAddress?: string },
  amount: number = 1,
): EtherscanERC20Transfer[] => {
  if (!amount) {
    amount = getRandomInt(1, 10);
  }

  return Array(amount)
    .fill(null)
    .map(() => generateTransfer(transferParams));
};

export const generateRandomTransfers = (
  amount: number = 1,
): EtherscanERC20Transfer[] => {
  return Array(amount)
    .fill(null)
    .map(() =>
      generateTransfer({
        from: generateEthereumAddress(),
        to: generateEthereumAddress(),
        tokenAddress: generateEthereumAddress(),
      }),
    );
};

export const getClaimConstraintsFromTransfer = (
  transfer: EtherscanERC20Transfer,
): ClaimConstraints => {
  return {
    minTransfersSum: BigInt(transfer.value),
    maxTransfersSum: BigInt(transfer.value),
    fromBlockTimestamp: BigInt(transfer.timeStamp),
    toBlockTimestamp: BigInt(transfer.timeStamp),
  };
};

export const getClaimConstraintsFromTransfers = (
  transfers: EtherscanERC20Transfer[],
): ClaimConstraints => {
  let totalSum = 0n;
  let minTimestamp = BigInt(transfers[0]!.timeStamp);
  let maxTimestamp = BigInt(transfers[0]!.timeStamp);

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

export const findTransferIndices = (
  proverTransfers: EtherscanERC20Transfer[],
  allTransfers: EtherscanERC20Transfer[],
): number[] => {
  return proverTransfers.map((proverTransfer) => {
    return allTransfers
      .map((transfer, index) => ({ transfer, index }))
      .filter((item) => item.transfer.blockHash === proverTransfer.blockHash)
      .map((item) => item.index)[0]!;
  });
};

export const buildMerkleTreeWithTransfers = async (
  allTransfers: EtherscanERC20Transfer[],
  hashTransferFn: (
    transfer: Pick<
      EtherscanERC20Transfer,
      "from" | "to" | "contractAddress" | "value" | "timeStamp"
    >,
  ) => Promise<Uint8Array>,
  merkleTreeZeroValuesStrArr: string[],
  poseidon2HashFn: (left: string, right: string) => Promise<string>,
  merkleTreeHeight: number,
): Promise<MerkleTree> => {
  const allTransfersHashes = await Promise.all(
    allTransfers.map(hashTransferFn),
  );
  const allTransfersHashesStrArr = allTransfersHashes.map((item) =>
    fieldToBigint(item).toString(),
  );

  const merkleTree = new MerkleTree(
    merkleTreeHeight,
    merkleTreeZeroValuesStrArr,
    poseidon2HashFn,
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
    >,
  ) => Promise<Uint8Array>;
  barretenbergApi: Barretenberg;
  merkleTreeHeight: number;
  maxTransfers: number;
  nullifier?: string;
  signature?: `0x${string}`;
  publicKey?: `0x${string}`;
  transferProofs?: MerkleProof[];
}

export const buildCircuitInputs = async (
  params: CircuitTestParams,
): Promise<{
  inputs: InputMap;
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
  );

  const proverTransferIndices = findTransferIndices(
    proverTransfers,
    allTransfers,
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
  const paddedProofs = padMerkleProofsArray(
    proofs,
    maxTransfers,
    merkleTreeHeight,
  );

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
      p.pathIndices.map((idx) => idx === 0),
    ),
    transfers_amount: circuitTransfers.length.toString(),
    prover_pub_key_x: pubKeyX,
    prover_pub_key_y: pubKeyY,
    prover_signature: fullSignature,
  } as unknown as InputMap;

  return { inputs, merkleTree };
};
