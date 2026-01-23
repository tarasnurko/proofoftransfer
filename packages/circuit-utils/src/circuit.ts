import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { CompiledCircuit, InputMap, Noir } from "@noir-lang/noir_js";

/**
 * Full proof generation and verification flow
 */
export async function proveAndVerify(
  circuit: CompiledCircuit,
  inputs: InputMap,
  threads: number = 1,
) {
  const api = await Barretenberg.new({ threads });
  const noir = new Noir(circuit);
  const backend = new UltraHonkBackend(circuit.bytecode, api);

  const { witness } = await noir.execute(inputs);

  const proofData = await backend.generateProof(witness);

  return backend.verifyProof({
    proof: proofData.proof,
    publicInputs: proofData.publicInputs,
  });
}
