# Zero-Knowledge Proof Generation Setup

## Overview

This system generates real ZK-SNARKs using Noir circuits to prove ERC20 transfers without revealing the sender's address.

## Architecture

1. **Next.js App** (Port 3000) - User interface
2. **Proof Server** (Port 3001) - Dedicated Node.js server for Noir circuit execution
3. **PostgreSQL Database** - Stores proof records

## Setup Instructions

### 1. Database Setup

Make sure PostgreSQL is running:
```bash
docker-compose up -d
```

Apply migrations:
```bash
yarn db:push
```

### 2. Environment Variables

Ensure `.env.local` has:
```env
DATABASE_URL=postgresql://postgres:12345678@localhost:5432/bbb
ETHERSCAN_API_KEY=your_key_here
```

### 3. Start Both Servers

**Option A: Run both servers together**
```bash
yarn dev:full
```

**Option B: Run separately**

Terminal 1 - Proof Server:
```bash
yarn proof-server
```

Terminal 2 - Next.js App:
```bash
yarn dev
```

## How It Works

### Proof Generation Flow

1. **Client Side:**
   - User connects wallet
   - Selects recipient, token, date range
   - Fetches transfers from Etherscan
   - Signs a message with MetaMask
   - Recovers public key from signature (REAL public key, not placeholder)
   - Computes address commitment: `Hash(address + salt)`

2. **Proof Server:**
   - Receives all data from client
   - Builds Merkle tree from transfers using Pedersen hash
   - Initializes Noir circuit
   - Generates witness from inputs
   - Generates ZK-SNARK proof using UltraHonk backend
   - Verifies proof
   - Stores in database

3. **Verification:**
   - Anyone can view proof at `/proof/[id]`
   - Fetches transfers matching proof criteria
   - Verifies amounts are within claimed range
   - Full ZK proof verification uses the stored proof data

## Technical Details

### Noir Circuit (`circuts/src/main.nr`)

The circuit verifies:
- ✅ Address commitment (proves ownership without revealing address)
- ✅ ECDSA signature (proves user signed the message)
- ✅ Merkle proofs (proves transfers are in global set)
- ✅ Amount constraints (proves total is within min/max)
- ✅ Date range (proves transfers are within time window)

### Data Flow

```
Client → API Route → Proof Server → Noir Circuit
                                   ↓
                                Database
```

### What's NOT Stored

For privacy:
- ❌ Sender's actual address (only commitment stored)
- ❌ Private key or wallet data
- ❌ Salt (only used locally for commitment)

### What IS Stored

Public verification data:
- ✅ Proof (hex string)
- ✅ Public inputs (merkle root, address commitment)
- ✅ Recipient address
- ✅ Token address
- ✅ Date range
- ✅ Amount constraints
- ✅ Message hash

## Troubleshooting

### "Proof generation server is not running"
Make sure the proof server is running on port 3001:
```bash
yarn proof-server
```

### WASM Loading Errors
The proof server runs in pure Node.js to avoid WASM issues in Next.js.
This is why we use a separate server.

### Database Connection Errors
Check that:
- PostgreSQL is running (docker-compose up)
- DATABASE_URL in .env.local is correct
- Database "bbb" exists

## API Endpoints

### POST /api/generate-proof
Proxies to proof server for ZK proof generation

### GET /api/proofs?id={id}
Retrieves proof by ID

### GET /api/proofs
Retrieves all proofs

### GET /api/transfers
Fetches ERC20 transfers from Etherscan

### GET /api/block-number
Converts timestamps to block numbers

## Proof Server Endpoints

### POST http://localhost:3001/generate-proof
Direct proof generation endpoint (used by API proxy)

### GET http://localhost:3001/health
Health check endpoint
