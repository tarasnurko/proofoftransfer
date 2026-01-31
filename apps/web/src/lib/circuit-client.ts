// Client-side circuit utilities with dynamic imports
// to avoid Turbopack build-time analysis

let cachedCircuit: any | null = null

/**
 * Load the compiled circuit from the public directory (client-side)
 */
export async function loadCircuitClient(): Promise<any> {
  if (cachedCircuit) {
    return cachedCircuit
  }

  const response = await fetch('/circuit.json')
  if (!response.ok) {
    throw new Error('Failed to load circuit')
  }

  cachedCircuit = await response.json()
  return cachedCircuit
}

/**
 * Generate a ZK proof using the circuit (client-side)
 * Uses dynamic imports to avoid build-time dependency analysis
 */
export async function generateProofClient(inputs: any, threads: number = 1) {
  // Dynamic imports
  const [{ Barretenberg, UltraHonkBackend }, { Noir }] = await Promise.all([
    import('@aztec/bb.js'),
    import('@noir-lang/noir_js'),
  ])

  const circuit = await loadCircuitClient()
  const api = await Barretenberg.new({ threads })
  const noir = new Noir(circuit)
  const backend = new UltraHonkBackend(circuit.bytecode, api)

  // Execute the circuit to get the witness
  const { witness } = await noir.execute(inputs)

  // Generate the proof
  const proofData = await backend.generateProof(witness)

  return {
    proof: proofData.proof,
    publicInputs: proofData.publicInputs,
  }
}

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
