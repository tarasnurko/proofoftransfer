# Backend Implementation Plan for Proof of Transfer Web App

## Overview
Implement full backend functionality including PostgreSQL database, Drizzle ORM, Etherscan API integration, form validation, and connect everything to the existing frontend components.

---

## 1. Docker Compose for PostgreSQL

**File:** `/apps/web/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pot-postgres
    environment:
      POSTGRES_USER: pot
      POSTGRES_PASSWORD: pot_dev_password
      POSTGRES_DB: proofoftransfer
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
volumes:
  postgres_data:
```

**Environment variables to add to `.env.local`:**
```
DATABASE_URL=postgresql://pot:pot_dev_password@localhost:5432/proofoftransfer
```

---

## 2. Install Dependencies

**Database (Drizzle ORM):**
```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit @types/pg
```

**UI Components (for datetime picker):**
```bash
npx shadcn@latest add calendar popover
```

**Files to create:**
- `/apps/web/src/db/index.ts` - Database connection
- `/apps/web/src/db/schema.ts` - Table definitions
- `/apps/web/drizzle.config.ts` - Drizzle config

---

## 3. Database Schema

**File:** `/apps/web/src/db/schema.ts`

### Claims Table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key (claim_id in circuit) |
| message | text | Claim message (used to compute claim_message_hash) |
| message_hash | varchar(66) | Poseidon2 hash of message (bytes32) |
| token_address | varchar(42) | ERC20 token contract |
| recipient_address | varchar(42) | Transfer recipient |
| min_transfers_sum | varchar(78) | uint128 as string (0 = no constraint) |
| max_transfers_sum | varchar(78) | uint128 as string (0 = no constraint) |
| from_block_timestamp | bigint | Unix timestamp (0 = no constraint) |
| to_block_timestamp | bigint | Unix timestamp (0 = no constraint) |
| chain_id | integer | Chain ID (8453 for Base) |
| creator_address | varchar(42) | Wallet that created claim |
| created_at | timestamp | Creation time |

### Proofs Table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| claim_id | uuid | Foreign key to claims |
| nullifier | varchar(78) | Unique per claim+prover (prevents reuse) |
| proof_data | text | The ZK proof bytes (hex) |
| public_inputs | jsonb | Public inputs used |
| transfers_root_hash | varchar(78) | Merkle root at proof time |
| prover_address | varchar(42) | Recovered from signature (or null if private) |
| created_at | timestamp | Submission time |

**Unique constraint:** (claim_id, nullifier) - prevents proof reuse

### Proof Verifications Table
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| proof_id | uuid | Foreign key to proofs |
| verifier_address | varchar(42) | Who verified (optional) |
| is_valid | boolean | Verification result |
| verified_at | timestamp | Verification time |
| error_message | text | If verification failed |

---

## 4. Drizzle Queries

**File:** `/apps/web/src/db/queries/claims.ts`
- `createClaim(data)` - Insert new claim, compute message_hash
- `getClaims()` - List all claims with proof counts
- `getClaimById(id)` - Single claim with full details
- `getClaimsByCreator(address)` - Claims by wallet

**File:** `/apps/web/src/db/queries/proofs.ts`
- `createProof(data)` - Insert proof (check nullifier uniqueness)
- `getProofsByClaimId(claimId)` - All proofs for a claim
- `getProofById(id)` - Single proof
- `checkNullifierExists(claimId, nullifier)` - Prevent reuse

**File:** `/apps/web/src/db/queries/verifications.ts`
- `createVerification(data)` - Record verification result
- `getVerificationsByProofId(proofId)` - Verification history
- `getVerificationStats(proofId)` - Count successful/failed

---

## 5. Etherscan API Integration (Base Chain)

**File:** `/apps/web/src/lib/etherscan.ts`

**Function:** `fetchERC20Transfers(params)`
- Uses Base Etherscan API: `https://api.basescan.org/api`
- Endpoint: `tokentx` for ERC20 transfers
- Filter by: token address, recipient, timestamp range
- Returns: `EtherscanERC20Transfer[]` (same type as circuits)

**Environment variable:**
```
BASESCAN_API_KEY=your_api_key
```

**Parameters:**
```typescript
interface FetchTransfersParams {
  tokenAddress: string
  recipientAddress: string
  fromTimestamp?: number // optional constraint
  toTimestamp?: number   // optional constraint
}
```

---

## 6. Form Validation with Zod + Datetime Pickers

**File:** `/apps/web/src/lib/validations/claim.ts`

```typescript
const createClaimSchema = z.object({
  claimMessage: z.string().min(1, "Message is required").max(500),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid token address"),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid recipient address"),
  minTransfersSum: z.string().optional().default("0"),
  maxTransfersSum: z.string().optional().default("0"),
  fromDate: z.date().optional(), // Converted to Unix timestamp
  toDate: z.date().optional(),   // Converted to Unix timestamp
})
```

**Datetime picker component:** Use shadcn's date picker or install `react-day-picker`
- Display user-friendly date/time selection
- Convert to Unix timestamps when saving to database
- 0 = no constraint (leave date picker empty)

**File:** `/apps/web/src/lib/validations/proof.ts`
- Validate proof submission data

---

## 7. Server Actions

**File:** `/apps/web/src/actions/claims.ts`
```typescript
'use server'

// Create a new claim - validates, computes message_hash, saves to DB
export async function createClaimAction(formData: FormData): Promise<{ success: boolean; claimId?: string; error?: string }>

// Get all claims with proof counts
export async function getClaimsAction(): Promise<Claim[]>

// Get single claim by ID
export async function getClaimByIdAction(id: string): Promise<Claim | null>
```

**File:** `/apps/web/src/actions/proofs.ts`
```typescript
'use server'

// Fetch transfers from Etherscan matching claim constraints
export async function fetchTransfersAction(claimId: string): Promise<{ transfers: EtherscanERC20Transfer[]; transfersRootHash: string }>

// Submit a proof - validates nullifier uniqueness
export async function submitProofAction(data: ProofSubmission): Promise<{ success: boolean; proofId?: string; error?: string }>

// Verify an existing proof
export async function verifyProofAction(proofId: string): Promise<{ isValid: boolean; error?: string }>

// Get proofs for a claim
export async function getProofsByClaimIdAction(claimId: string): Promise<Proof[]>

// Get verification stats
export async function getVerificationStatsAction(proofId: string): Promise<{ total: number; successful: number; failed: number }>
```

---

## 8. Connect to Frontend

### Update `create-claim-form.tsx`
- Use `react-hook-form` with `zodResolver`
- Replace timestamp number inputs with datetime pickers (shadcn date picker)
- Call `createClaimAction` on submit
- Show loading/success/error states with `sonner` toasts
- Redirect to claims list after success

### Update `claims-list.tsx`
- Fetch claims from database via `getClaimsAction`
- Show real proof counts

### Update `/proof` page
- Fetch claim details from database
- Call Etherscan API to get transfers
- Display real transfers with highlighting
- Implement proof generation (sign message, call circuit)
- Submit proof to database

### New page: `/claims/[id]`
- Show claim details
- List all proofs for this claim
- Show verification stats

---

## 9. Implementation Order

1. **Docker + Database setup**
   - Create docker-compose.yml
   - Add DATABASE_URL and BASESCAN_API_KEY to .env.local
   - Install drizzle-orm and postgres
   - Start postgres: `docker compose up -d`

2. **Schema + Migrations**
   - Create schema.ts with all tables
   - Create drizzle.config.ts
   - Run `pnpm drizzle-kit generate` and `pnpm drizzle-kit migrate`

3. **Query functions**
   - Create all CRUD operations for claims, proofs, verifications
   - Add proper error handling

4. **Etherscan integration**
   - Create fetchERC20Transfers function
   - Handle pagination and rate limiting

5. **Validation schemas**
   - Create Zod schemas for claims and proofs

6. **Server actions**
   - Implement all actions
   - Connect to query functions

7. **UI Components**
   - Add shadcn calendar and popover components
   - Create date-picker component

8. **Frontend integration**
   - Update create-claim-form.tsx with react-hook-form and datetime pickers
   - Update claims-list.tsx to fetch real data
   - Update proof page to use real transfers and submit proofs
   - Create claim detail page at /claims/[id]
   - Add toast notifications for success/error states

---

## Files to Create/Modify

**New files:**
- `/apps/web/docker-compose.yml`
- `/apps/web/drizzle.config.ts`
- `/apps/web/src/db/index.ts`
- `/apps/web/src/db/schema.ts`
- `/apps/web/src/db/queries/claims.ts`
- `/apps/web/src/db/queries/proofs.ts`
- `/apps/web/src/db/queries/verifications.ts`
- `/apps/web/src/lib/etherscan.ts`
- `/apps/web/src/lib/validations/claim.ts`
- `/apps/web/src/lib/validations/proof.ts`
- `/apps/web/src/actions/claims.ts`
- `/apps/web/src/actions/proofs.ts`
- `/apps/web/src/app/claims/[id]/page.tsx`
- `/apps/web/src/components/ui/date-picker.tsx` (shadcn component)
- `/apps/web/src/components/ui/calendar.tsx` (shadcn component)
- `/apps/web/src/components/ui/popover.tsx` (shadcn component)

**Files to modify:**
- `/apps/web/.env.local` (add DATABASE_URL, BASESCAN_API_KEY)
- `/apps/web/package.json` (add drizzle-orm, postgres, date-fns dependencies)
- `/apps/web/src/components/create-claim-form.tsx` (add datetime pickers, react-hook-form)
- `/apps/web/src/components/claims-list.tsx` (fetch real data)
- `/apps/web/src/app/proof/page.tsx` (fetch real transfers, submit proofs)

---

## Verification

1. Run `docker compose up -d` to start PostgreSQL
2. Run `pnpm drizzle-kit migrate` to create tables
3. Start dev server `pnpm dev`
4. Create a claim via the form
5. Verify claim appears in claims list
6. Navigate to proof page and fetch transfers
7. Generate and submit a proof
8. Verify proof appears on claim detail page
