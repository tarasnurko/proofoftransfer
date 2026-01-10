import { Barretenberg } from "@aztec/bb.js";

import { bigIntToFr, frToBigInt, stringToFr } from "./encodingUtils.js";

export const hashString = async (
  api: Barretenberg,
  value: string
): Promise<Uint8Array> => {
  const result = await api.poseidon2Hash({
    inputs: [stringToFr(value)],
  });
  return result.hash;
};

export const poseidon2Hash = async (
  api: Barretenberg,
  left: Uint8Array,
  right: Uint8Array
): Promise<Uint8Array> => {
  const result = await api.poseidon2Hash({
    inputs: [left, right],
  });
  return result.hash;
};

export const poseidon2HashStrings = async (
  api: Barretenberg,
  left: string,
  right: string
): Promise<string> => {
  const leftFr = bigIntToFr(BigInt(left));
  const rightFr = bigIntToFr(BigInt(right));
  const hashResult = await poseidon2Hash(api, leftFr, rightFr);
  return frToBigInt(hashResult).toString();
};

export const hashTransfer = async (
  api: Barretenberg,
  senderAddress: string,
  recipientAddress: string,
  tokenAddress: string,
  amount: string,
  blockTimestamp: string
): Promise<Uint8Array> => {
  const result = await api.poseidon2Hash({
    inputs: [
      bigIntToFr(BigInt(senderAddress)),
      bigIntToFr(BigInt(recipientAddress)),
      bigIntToFr(BigInt(tokenAddress)),
      bigIntToFr(BigInt(amount)),
      bigIntToFr(BigInt(blockTimestamp)),
    ],
  });
  return result.hash;
};
