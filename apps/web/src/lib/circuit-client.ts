// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedCircuit: any = null

export async function loadCircuitClient() {
  if (cachedCircuit) {
    return cachedCircuit
  }

  const response = await fetch('/circuit.json')
  if (!response.ok) {
    throw new Error('Failed to load circuit')
  }

  cachedCircuit = await response.json()
  return cachedCircuit!
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateProofClient(inputs: any, threads: number = 1) {
  const [{ Barretenberg, UltraHonkBackend }, { Noir }] = await Promise.all([
    import('@aztec/bb.js'),
    import('@noir-lang/noir_js'),
  ])

  const circuit = await loadCircuitClient()
  const bb = await Barretenberg.new({ threads })
  const noir = new Noir(circuit)
  const backend = new UltraHonkBackend(circuit.bytecode, bb)

  const { witness } = await noir.execute(inputs)

  const proofData = await backend.generateProof(witness)

  return {
    proof: proofData.proof,
    publicInputs: proofData.publicInputs,
  }
}
