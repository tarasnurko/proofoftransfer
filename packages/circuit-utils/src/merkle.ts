import type { MerkleProof, HashFn, HashFnField } from "./types.js";

/**
 * Async Merkle Tree implementation
 * Matches the circuit's merkle tree structure
 */
export class MerkleTree {
  private levels: number;
  private storage: Map<string, string>;
  private zeros: string[];
  private totalLeaves: number;
  private hashFn: HashFn;

  constructor(levels: number, zeros: string[], hashFn: HashFn) {
    if (zeros.length < levels + 1) {
      throw new Error("Not enough zero values for the tree height");
    }
    this.levels = levels;
    this.zeros = zeros;
    this.storage = new Map();
    this.totalLeaves = 0;
    this.hashFn = hashFn;
  }

  /**
   * Initialize tree with optional default leaves
   */
  async init(leaves: string[] = []): Promise<void> {
    if (leaves.length === 0) return;

    this.totalLeaves = leaves.length;

    // Store leaves at level 0
    leaves.forEach((leaf, index) => {
      this.storage.set(this.indexToKey(0, index), leaf);
    });

    // Build tree bottom-up
    for (let level = 1; level <= this.levels; level++) {
      const numNodes = Math.ceil(this.totalLeaves / 2 ** level);
      for (let i = 0; i < numNodes; i++) {
        const left = this.getNode(level - 1, this.leftChildIndex(i));
        const right = this.getNode(level - 1, this.rightChildIndex(i));
        const hash = await this.hashFn(left, right);
        this.storage.set(this.indexToKey(level, i), hash);
      }
    }
  }

  /**
   * Insert a new leaf
   */
  async insert(leaf: string): Promise<void> {
    const index = this.totalLeaves;
    await this.update(index, leaf);
    this.totalLeaves++;
  }

  /**
   * Update a leaf at given index
   */
  private async update(index: number, newLeaf: string): Promise<void> {
    let currentHash = newLeaf;
    let currentIndex = index;

    // Store leaf
    this.storage.set(this.indexToKey(0, currentIndex), currentHash);

    // Update path to root
    for (let level = 0; level < this.levels; level++) {
      const sibling = this.getNode(level, this.siblingIndex(currentIndex));

      const [left, right] =
        currentIndex % 2 === 0
          ? [currentHash, sibling]
          : [sibling, currentHash];

      currentHash = await this.hashFn(left, right);
      currentIndex = Math.floor(currentIndex / 2);

      this.storage.set(this.indexToKey(level + 1, currentIndex), currentHash);
    }
  }

  /**
   * Get Merkle proof for a leaf at given index
   */
  proof(index: number): MerkleProof {
    const leaf = this.storage.get(this.indexToKey(0, index));
    if (!leaf) throw new Error(`Leaf not found at index ${index}`);

    const pathElements: string[] = [];
    const pathIndices: number[] = [];

    let currentIndex = index;
    for (let level = 0; level < this.levels; level++) {
      const sibling = this.getNode(level, this.siblingIndex(currentIndex));

      pathElements.push(sibling);
      pathIndices.push(currentIndex % 2);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      root: this.root(),
      pathElements,
      pathIndices,
      leaf,
    };
  }

  /**
   * Get the Merkle root
   */
  root(): string {
    return (
      this.storage.get(this.indexToKey(this.levels, 0)) ||
      this.zeros[this.levels]!
    );
  }

  /**
   * Find index of a leaf by value
   */
  indexOf(leaf: string): number {
    for (const [key, value] of this.storage.entries()) {
      if (value === leaf && key.startsWith("0-")) {
        return parseInt(key.split("-")[1]!);
      }
    }
    return -1;
  }

  /**
   * Get node at level and index, returns zero value if not found
   */
  private getNode(level: number, index: number): string {
    return (
      this.storage.get(this.indexToKey(level, index)) || this.zeros[level]!
    );
  }

  /**
   * Convert level and index to storage key
   */
  private indexToKey(level: number, index: number): string {
    return `${level}-${index}`;
  }

  /**
   * Get left child index
   */
  private leftChildIndex(index: number): number {
    return 2 * index;
  }

  /**
   * Get right child index
   */
  private rightChildIndex(index: number): number {
    return 2 * index + 1;
  }

  /**
   * Get sibling index
   */
  private siblingIndex(index: number): number {
    return index % 2 === 0 ? index + 1 : index - 1;
  }
}

/**
 * Generate zero values for Merkle tree (Uint8Array/Field version)
 * Each level's zero is hash(previousZero, previousZero)
 */
export const generateZeroValuesField = async (
  initialValue: Uint8Array,
  height: number,
  hashFn: HashFnField,
): Promise<Uint8Array[]> => {
  const zeroValues: Uint8Array[] = [initialValue];

  for (let i = 1; i <= height; i++) {
    const prevZeroValue = zeroValues[i - 1]!;
    const currentLevelHash = await hashFn(prevZeroValue, prevZeroValue);
    zeroValues[i] = currentLevelHash;
  }

  return zeroValues;
};

/**
 * Generate zero values for Merkle tree (string version)
 * Each level's zero is hash(previousZero, previousZero)
 */
export async function generateZeroValues(
  initialZero: string,
  height: number,
  hashFn: HashFn,
): Promise<string[]> {
  const zeros: string[] = [initialZero];

  for (let i = 1; i <= height; i++) {
    const previousZero = zeros[i - 1]!;
    zeros[i] = await hashFn(previousZero, previousZero);
  }

  return zeros;
}
