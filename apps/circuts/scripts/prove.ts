import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";

async function generateProof() {
  try {
    console.log("📦 Loading compiled circuit...");

    // Load the compiled circuit
    const circuitPath = resolve(process.cwd(), "target/circuts.json");
    const circuitFile = await readFile(circuitPath, "utf-8");
    const circuit = JSON.parse(circuitFile);

    console.log("✅ Circuit loaded successfully");

    // Initialize Barretenberg API first
    console.log("🔧 Initializing Barretenberg API...");
    const api = await Barretenberg.new({ threads: 1 });
    console.log("✅ API initialized");

    // Initialize Noir and backend
    console.log("🔧 Initializing backend...");
    const noir = new Noir(circuit);
    const backend = new UltraHonkBackend(circuit.bytecode, api);

    console.log("✅ Backend initialized");

    // Define inputs for the circuit
    // Your circuit expects: x (private), y (public)
    const inputs = {
      x: "42",
      y: "100",
    };

    console.log("📝 Circuit inputs:", inputs);

    // Generate witness
    console.log("🔄 Generating witness...");
    const { witness, returnValue } = await noir.execute(inputs);
    console.log("✅ Witness generated");

    console.log("-------- return value --------");
    console.log(parseInt(returnValue.toString()));
    console.log("------------------------------");

    // Generate proof
    console.log("🔄 Generating proof...");
    const proofData = await backend.generateProof(witness);
    console.log("✅ Proof generated successfully!");

    // Save proof to file
    const proofPath = resolve(process.cwd(), "proofs/proof.json");
    await writeFile(
      proofPath,
      JSON.stringify({
        publicInputs: proofData.publicInputs,
        proof: Array.from(proofData.proof),
      })
    );

    console.log(`💾 Proof saved to: ${proofPath}`);
    console.log(`📏 Proof size: ${proofData.proof.length} bytes`);

    // Cleanup
    await api.destroy();
  } catch (error) {
    console.error("❌ Error generating proof:", error);
    process.exit(1);
  }
}

generateProof();
