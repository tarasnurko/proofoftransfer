# Proof of Transfer

Prove token transfers using zero-knowledge proofs without revealing your wallet address.

## The Problem

On-chain transfers are fully public. Proving you sent tokens to someone reveals your wallet address — and with it, your entire transaction history, balances, and every interaction tied to that address.

## What This Does

Proof of Transfer lets you prove you made a token transfer without revealing which wallet is yours. You generate a **zero-knowledge proof** that cryptographically proves your transfer exists and satisfies certain constraints — without disclosing your wallet address to anyone, including the app itself.

Third parties can independently **verify** these proofs by fetching their own transfer data from the blockchain, so they don't need to trust the app either.

## Use Cases

- **Anonymous donations** — prove you donated without revealing your wallet or exact amount
- **Raffle participation** — prove you participated without revealing who you are
- **Gift verification** — prove you contributed without revealing your wallet to the group
- **Compliance attestations** — prove a transfer happened without exposing the sender's on-chain identity

## How It Works

1. Someone creates a **claim** — constraints describing transfers (token, counterparty, chain, time range, amount, count)
2. The app fetches matching transfers from the blockchain and builds a Poseidon2 merkle tree
3. Anyone with a matching transfer can **generate a ZK proof** in-browser — without revealing their address
4. Third parties **verify proofs** by independently fetching transfer data

No wallet addresses are stored. Identity is based on **nullifiers** — anonymous identifiers derived from your wallet's EIP-712 signature. Different claims produce different nullifiers, so activity can't be linked across claims.

## Supported Tokens and Chains

**Token types:** ERC-20, ERC-721, ERC-1155

**Chains:** Ethereum, Optimism, BNB Chain, Polygon, Base, Arbitrum, Scroll

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Wallet | wagmi + @reown/appkit |
| ZK Circuit | Noir (Aztec), compiled to UltraHonk |
| ZK Runtime | @aztec/bb.js (Barretenberg WASM) |
| Database | PostgreSQL + Drizzle ORM |
| Server Actions | next-safe-action + Zod |
| Blockchain Data | Etherscan API (multi-chain) |
| Monorepo | Turborepo + pnpm |

## Project Structure

```
apps/
  web/          # Main Next.js application
  docs/         # Documentation site (Fumadocs)
  circuits/     # Noir ZK circuit
packages/
  types/        # Shared TypeScript types
  circuit-utils/ # Circuit utility functions
  circuit-noir/ # Shared Noir library
```

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm 9
- PostgreSQL

### Setup

```bash
pnpm install

# Start PostgreSQL (or use your own)
docker compose -f apps/web/docker-compose.yml up -d

# Set environment variables
cp apps/web/.env.example apps/web/.env.local

# Run database migrations
pnpm --filter web db:migrate

# Start development
pnpm dev
```

The web app runs on `http://localhost:3000`, docs on `http://localhost:3001`.

## Acknowledgments

Born at **ETHKyiv Impulse: ZK Edition** — a hackathon organized by [Ethereum Ukraine](https://kyivethereum.com/) on December 13, 2025 in Kyiv, Ukraine.
