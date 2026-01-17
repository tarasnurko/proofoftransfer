import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { EtherscanERC20Transfer } from "../types/index.types";
import type { MerkleProof } from "../scripts/merkleTree";

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
  let {
    minTransfersSum,
    maxTransfersSum,
    fromBlockTimestamp,
    toBlockTimestamp,
  } = getClaimConstraintsFromTransfer(transfers[0]);

  for (let i = 1; i < transfers.length; i++) {
    const currentTransferClaimConstraints = getClaimConstraintsFromTransfer(
      transfers[i]
    );

    if (currentTransferClaimConstraints.minTransfersSum < minTransfersSum) {
      minTransfersSum = currentTransferClaimConstraints.minTransfersSum;
    }

    if (currentTransferClaimConstraints.maxTransfersSum > maxTransfersSum) {
      maxTransfersSum = currentTransferClaimConstraints.maxTransfersSum;
    }

    if (
      currentTransferClaimConstraints.fromBlockTimestamp < fromBlockTimestamp
    ) {
      fromBlockTimestamp = currentTransferClaimConstraints.fromBlockTimestamp;
    }

    if (currentTransferClaimConstraints.toBlockTimestamp > toBlockTimestamp) {
      toBlockTimestamp = currentTransferClaimConstraints.toBlockTimestamp;
    }
  }

  return {
    minTransfersSum,
    maxTransfersSum,
    fromBlockTimestamp,
    toBlockTimestamp,
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
