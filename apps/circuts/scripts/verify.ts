import { Barretenberg, UltraHonkBackend } from '@aztec/bb.js';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

async function verifyProof() {
  try {
    console.log('📦 Loading compiled circuit...');

    // Load the compiled circuit
    const circuitPath = resolve(process.cwd(), 'target/circuts.json');
    const circuitFile = await readFile(circuitPath, 'utf-8');
    const circuit = JSON.parse(circuitFile);

    console.log('✅ Circuit loaded successfully');

    // Initialize Barretenberg API first
    console.log('🔧 Initializing Barretenberg API...');
    const api = await Barretenberg.new({ threads: 1 });
    console.log('✅ API initialized');

    // Initialize backend
    console.log('🔧 Initializing backend...');
    const backend = new UltraHonkBackend(circuit.bytecode, api);
    console.log('✅ Backend initialized');

    // Load proof from file
    console.log('📂 Loading proof...');
    const proofPath = resolve(process.cwd(), 'proofs/proof.json');
    const proofFile = await readFile(proofPath, 'utf-8');
    const proofData = JSON.parse(proofFile);

    console.log('✅ Proof loaded');
    console.log(`📏 Proof size: ${proofData.proof.length} bytes`);

    // Convert proof array back to Uint8Array
    const proof = new Uint8Array(proofData.proof);

    // Verify the proof
    console.log('🔄 Verifying proof...');
    const isValid = await backend.verifyProof({
      proof,
      publicInputs: proofData.publicInputs,
    });

    if (isValid) {
      console.log('✅ Proof is VALID! 🎉');
    } else {
      console.log('❌ Proof is INVALID');
      process.exit(1);
    }

    // Cleanup
    await api.destroy();

  } catch (error) {
    console.error('❌ Error verifying proof:', error);
    process.exit(1);
  }
}

verifyProof();
