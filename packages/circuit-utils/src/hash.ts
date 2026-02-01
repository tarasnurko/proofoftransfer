import type { Barretenberg } from "@aztec/bb.js";
import type { EtherscanERC20Transfer } from "@repo/types";

import { bigintToField, fieldToBigint, stringToField } from "./encoding.js";

export const hashString = async (
  api: Barretenberg,
  value: string,
): Promise<Uint8Array> => {
  const result = await api.poseidon2Hash({
    inputs: [stringToField(value)],
  });
  return result.hash;
};

export const poseidon2HashLeftRight = async (
  api: Barretenberg,
  left: Uint8Array,
  right: Uint8Array,
): Promise<Uint8Array> => {
  const result = await api.poseidon2Hash({
    inputs: [left, right],
  });
  return result.hash;
};

export const poseidon2HashStringsLeftRight = async (
  api: Barretenberg,
  left: string,
  right: string,
): Promise<string> => {
  const leftField = bigintToField(BigInt(left));
  const rightField = bigintToField(BigInt(right));
  const hashResult = await poseidon2HashLeftRight(api, leftField, rightField);
  return fieldToBigint(hashResult).toString();
};

export const hashTransfer = async (
  api: Barretenberg,
  transfer: Pick<
    EtherscanERC20Transfer,
    "from" | "to" | "contractAddress" | "value" | "timeStamp"
  >,
): Promise<Uint8Array> => {
  const result = await api.poseidon2Hash({
    inputs: [
      bigintToField(BigInt(transfer.from)),
      bigintToField(BigInt(transfer.to)),
      bigintToField(BigInt(transfer.contractAddress)),
      bigintToField(BigInt(transfer.value)),
      bigintToField(BigInt(transfer.timeStamp)),
    ],
  });
  return result.hash;
};

export const computeNullifier = async (
  api: Barretenberg,
  signature: number[],
): Promise<string> => {
  const sigFields: Uint8Array[] = [];
  for (let i = 0; i < 8; i++) {
    let chunk = 0n;
    for (let j = 0; j < 8; j++) {
      chunk = chunk * 256n + BigInt(signature[i * 8 + j]!);
    }
    sigFields.push(bigintToField(chunk));
  }

  const nullifierResult = await api.poseidon2Hash({
    inputs: sigFields,
  });

  return fieldToBigint(nullifierResult.hash).toString();
};
