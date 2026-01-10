export const generateZeroValues = async (
  initialValue: Uint8Array,
  height: number,
  hashFn: (left: Uint8Array, right: Uint8Array) => Promise<Uint8Array>
): Promise<Uint8Array[]> => {
  const zeroValues: Uint8Array[] = [initialValue];

  for (let i = 1; i <= height; i++) {
    const prevZeroValue = zeroValues[i - 1];
    const currentLevelHash = await hashFn(prevZeroValue, prevZeroValue);
    zeroValues[i] = currentLevelHash;
  }

  return zeroValues;
};
