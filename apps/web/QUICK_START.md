# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Set Up Environment

1. **Add Basescan API Key** to `.env.local`:
```env
BASESCAN_API_KEY=YOUR_API_KEY_HERE
```
Get a free key at: https://basescan.org/apis

2. **Verify PostgreSQL is running**:
```bash
docker compose up -d
docker ps | grep pot-postgres
```

### Step 2: Start the App

```bash
pnpm dev
```

Open http://localhost:3000

### Step 3: Test the Flow

1. **Create a Claim** at `/create`:
   - Use USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - Pick any recipient address that has received USDC

2. **Fetch Transfers** at `/proof`:
   - Enter a prover address
   - Click "Fetch Transfers" to get real data from Basescan

3. **Generate & Submit Proof**:
   - Generate mock proof (circuit integration coming soon)
   - Submit to database
   - View on claim detail page

## 📝 Database Commands

```bash
# View all claims
docker exec pot-postgres psql -U pot -d proofoftransfer -c "SELECT * FROM claims;"

# View all proofs
docker exec pot-postgres psql -U pot -d proofoftransfer -c "SELECT * FROM proofs;"

# Open Drizzle Studio
pnpm db:studio
```

## 🔧 Troubleshooting

**Port 5432 already in use?**
```bash
# Find and stop conflicting PostgreSQL
lsof -ti:5432 | xargs kill -9

# Or change port in docker-compose.yml
```

**Database connection failed?**
```bash
docker compose down
docker compose up -d
```

**Rate limited by Basescan?**
- Get a premium API key
- Wait a few minutes and try again

## ✅ What Works Now

- ✅ Create claims with date/time constraints
- ✅ Fetch real ERC20 transfers from Basescan
- ✅ Submit proofs with nullifier uniqueness
- ✅ Verify proofs and track results
- ✅ View all claims and proofs
- ✅ Full database persistence

## 🚧 TODO for Full Production

1. **Connect Wallet** - Replace placeholder with actual wagmi hooks
2. **Circuit Integration** - Add compiled circuit for real ZK proofs
3. **API Key** - Add your Basescan API key

See `IMPLEMENTATION_SUMMARY.md` for detailed information.
