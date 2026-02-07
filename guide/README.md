# Proof of Transfer — Documentation

Proof of Transfer is a web application that lets users create verifiable claims about ERC-20 token transfers and prove them using zero-knowledge proofs. Anyone can independently verify these proofs without trusting the application.

## Documentation

### [User Guide](./user-guide.md)

Step-by-step instructions for using the application:

- Creating claims
- Generating proofs
- Verifying proofs
- Uploading CSV transfer data

### [Technical Overview](./how-it-works.md)

Deep dive into how the system works:

- Identity model (nullifiers)
- Merkle trees and transfer ordering
- ZK proof generation and verification
- EIP-712 signing
- Data model and architecture
- Security properties and trust model
