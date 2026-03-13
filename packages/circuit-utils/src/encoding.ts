// BN254 scalar field modulus used by Noir
const BN254_FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const reduceToField = (value: bigint): bigint => value % BN254_FIELD_MODULUS;

export const bigintToField = (value: bigint): Uint8Array => {
  const buffer = new Uint8Array(32);
  let v = value;
  for (let i = 31; i >= 0; i--) {
    buffer[i] = Number(v & 0xffn);
    v >>= 8n;
  }

  return buffer;
};

export const fieldToBigint = (field: Uint8Array): bigint => {
  let result = 0n;
  for (let i = 0; i < 32; i++) {
    result = (result << 8n) | BigInt(field[i]!);
  }
  return result;
};

export const stringToField = (value: string): Uint8Array => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  const buffer = new Uint8Array(32);

  for (let i = 0; i < Math.min(bytes.length, 32); i++) {
    buffer[i] = bytes[i]!;
  }

  return buffer;
};

export function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const matches = clean.match(/.{1,2}/g);
  if (!matches) throw new Error("Invalid hex string");
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

export function uint8ArrayToHex(bytes: Uint8Array): string {
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
