# Noir Circuit Proof Generation & Verification

This directory contains TypeScript scripts for generating and verifying zero-knowledge proofs using Noir and Barretenberg.

## Prerequisites

- Node.js >= 18
- Nargo (Noir compiler) installed
- Dependencies installed (`pnpm install`)

## Circuit

The circuit in `src/main.nr` is a simple example that proves `x != y` where:
- `x`: private input (u64)
- `y`: public input (u64)

## Workflow

### 1. Compile the Circuit

```bash
pnpm run compile
# or
nargo compile
```

This generates `target/circuts.json` containing the compiled circuit bytecode.

### 2. Generate a Proof

```bash
pnpm run prove
```

This script (`scripts/prove.ts`):
- Loads the compiled circuit
- Initializes the Barretenberg proving system
- Generates a witness from the inputs
- Creates a zero-knowledge proof
- Saves the proof to `proofs/proof.json`

**Default inputs:**
- x = "42" (private)
- y = "100" (public)

**To customize inputs:** Edit `scripts/prove.ts` and modify the `inputs` object (lines 30-33).

### 3. Verify the Proof

```bash
pnpm run verify
```

This script (`scripts/verify.ts`):
- Loads the compiled circuit
- Initializes the Barretenberg verification system
- Loads the proof from `proofs/proof.json`
- Verifies the proof is valid

## Modifying Inputs

To change the proof inputs, edit `scripts/prove.ts`:

```typescript
const inputs = {
  x: '42',    // Change this
  y: '100',   // Change this
};
```

Then regenerate the proof:
```bash
pnpm run prove
pnpm run verify
```

## File Structure

```
circuts/
├── src/
│   └── main.nr          # Noir circuit source
├── scripts/
│   ├── prove.ts         # Proof generation script
│   └── verify.ts        # Proof verification script
├── target/
│   └── circuts.json     # Compiled circuit (generated)
├── proofs/
│   └── proof.json       # Generated proof (generated)
├── Nargo.toml           # Noir project config
├── package.json         # Node.js dependencies
└── tsconfig.json        # TypeScript config
```

## Technologies Used

- **Noir**: Zero-knowledge circuit language
- **Barretenberg**: Aztec's proving system (UltraHonk)
- **@aztec/bb.js**: Barretenberg JavaScript bindings
- **@noir-lang/noir_js**: Noir JavaScript runtime

## Proof Details

The generated proof uses:
- **Proving system**: UltraHonk
- **Hash function**: Poseidon2 (default) or Keccak (for EVM verification)
- **Proof size**: ~16KB for this simple circuit
- **Public inputs**: The value of `y`

## Next Steps

To implement your actual circuit requirements (see README.md):

1. Update `src/main.nr` with your circuit logic
2. Modify `scripts/prove.ts` to match your circuit's inputs
3. Recompile: `pnpm run compile`
4. Generate proof: `pnpm run prove`
5. Verify: `pnpm run verify`
