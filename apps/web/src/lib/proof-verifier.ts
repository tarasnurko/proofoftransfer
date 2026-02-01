/**
 * Client-side proof verification using Noir.js
 */
export async function verifyProofClient(
  proofData: Uint8Array,
  publicInputs: string[]
): Promise<boolean> {
  // Dynamic imports to avoid build-time analysis
  const [{ Barretenberg, UltraHonkBackend }] = await Promise.all([
    import('@aztec/bb.js'),
  ])

  // Load circuit
  const response = await fetch('/circuit.json')
  if (!response.ok) {
    throw new Error('Failed to load circuit')
  }
  const circuit = await response.json()

  // Initialize Barretenberg and backend
  const api = await Barretenberg.new({ threads: 1 })
  const backend = new UltraHonkBackend(circuit.bytecode, api)

  // Verify the proof
  const result = await backend.verifyProof({
    proof: proofData,
    publicInputs: publicInputs,
  })

  return result
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex

  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16)
  }

  return bytes
}
