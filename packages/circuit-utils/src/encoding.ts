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
