# Security Audit — Vulnerability Report

## Context

Open-source project fully visible to attackers. Audit covers server actions, Hono API routes, DB queries, rate limiting, input validation, and infrastructure security.

---

## CRITICAL / HIGH

### 1. Error Messages Leak Internal Details

**Files:**
- `apps/web/src/lib/api/app.ts:14-17` — global Hono error handler returns `err.message` to client
- `apps/web/src/lib/safe-action.ts:7-9` — `handleServerError` returns `e.message` to client
- `apps/web/src/lib/proof.server.ts:127-132` — root mismatch error leaks computed vs expected root hashes

**Risk:** Exposes internal paths, DB error details, stack info. Attackers use this to map infrastructure.

**Fix:** Return generic error to client, log real error server-side. Map known errors to safe messages.

---

### 2. In-Memory Rate Limiting Ineffective in Serverless

**File:** `apps/web/src/services/rate-limit/rate-limit.service.ts:25`

**Risk:** Uses `new Map()` in-memory store. On serverless (Vercel), each cold start = fresh map = no rate limits. Even on long-running server, the store isn't shared across workers/instances.

**Fix:** Use external store (Redis/Upstash) or Vercel's built-in rate limiting. At minimum, document this limitation.

---

### 3. IP Spoofing Bypasses Rate Limiting

**File:** `apps/web/src/services/rate-limit/rate-limit.service.ts:64-69`

```ts
headers.get('x-forwarded-for')?.split(',')[0]?.trim()
```

**Risk:** Attacker sets arbitrary `X-Forwarded-For` header to get a fresh rate limit bucket per request. Vercel overwrites this header, but self-hosted deployments don't.

**Fix:** If deployed on Vercel, this is OK. If self-hosted, must configure trusted proxy to strip this header. Add a comment documenting the assumption.

---

### 4. No CORS on Hono API Routes

**File:** `apps/web/src/lib/api/app.ts`

**Risk:** No CORS middleware = any origin can call GET/POST endpoints. Attacker's site can:
- Trigger `POST /api/claims/load-transfers` to write transfers to your DB
- Trigger `POST /api/signature/process`
- Trigger `POST /api/claims/:id/prover-signing-data`
- Read all GET endpoint data cross-origin

**Fix:** Add `cors()` middleware from `hono/cors` with allowed origins.

---

### 5. No Security Headers (No Middleware)

**Risk:** No `middleware.ts` exists. Missing:
- `Content-Security-Policy` — no XSS mitigation
- `X-Frame-Options` / `frame-ancestors` — clickjacking possible
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Strict-Transport-Security`

**Fix:** Add `apps/web/src/middleware.ts` with security headers. Or add headers in `next.config.js`.

---

## MEDIUM

### 6. Unbounded Proof Data Size — Storage & Memory DoS

**File:** `apps/web/src/validations/proof.ts:10-14`

```ts
proofData: z.string().min(1)           // no max!
publicInputs: z.array(z.string()).min(1) // no max length or item size!
```

**Risk:** Attacker submits multi-MB proof data → DB bloat. During verification, entire proof is loaded into memory + WASM.

**Fix:** Add `.max()` to both `proofData` (e.g., 100KB) and `publicInputs` (max array length + item size).

---

### 7. Weak Validation on `/api/claims/load-transfers` Body

**File:** `apps/web/src/lib/api/routes/claims.routes.ts:49-55`

```ts
const loadTransfersBody = z.object({
  chainId: z.number(),                  // not validated against ChainId enum
  tokenAddress: z.string(),             // not validated as ethereum address
  recipientAddress: z.string(),         // not validated as ethereum address
```

**Risk:**
- Arbitrary `chainId` → unexpected Etherscan API calls
- Non-address strings stored in DB `tokenAddress`/`recipientAddress` columns

**Fix:** Use `z.nativeEnum(ChainId)`, `ethereumAddressLowercaseSchema` for addresses.

---

### 8. No CSRF Protection on Hono POST Routes

**Files:** `claims.routes.ts` (load-transfers, prover-signing-data), `signature.routes.ts` (process)

**Risk:** Server actions get Next.js origin check automatically, but Hono routes don't. Cross-site POST requests succeed.

**Fix:** Add origin/referer check middleware for POST routes, or use CORS with credentials mode.

---

### 9. Resource Exhaustion via Barretenberg WASM Instantiation

**Files:** `claims.actions.ts:20`, `claims.routes.ts:128`, `signature.routes.ts:21`, `proof.server.ts:109`

**Risk:** `Barretenberg.new({ threads: 1 })` instantiated per-request. Each WASM instance = significant memory. Under concurrent load → OOM. Rate limiting (issues #2-3) doesn't reliably protect.

**Fix:** Pool/singleton Barretenberg instance, or queue proof operations. At minimum, add request concurrency limits.

---

### 10. `verifierNullifier` Is Nullable in DB Schema

**File:** `apps/web/src/db/schema.ts:72`

```ts
verifierNullifier: varchar({ length: 78 }), // nullable!
```

**Risk:** If a bug or direct DB manipulation creates a verification with null nullifier, `getSuccessfulVerificationByNullifier` with `eq(field, nullifier)` could match null entries, potentially allowing duplicate verifications.

**Fix:** Add `.notNull()` to the column. Run migration.

---

### 11. No Request Body Size Limits on Hono

**Risk:** Hono accepts arbitrarily large POST bodies. Combined with #6, an attacker can send huge requests to exhaust memory.

**Fix:** Add body size limit middleware (Hono has `bodyLimit()` middleware).

---

## LOW

### 12. No Audit Logging

**Risk:** No logging of claim creation, proof submission, verification attempts, or API errors (except `console.error`). Impossible to investigate abuse or incidents.

**Fix:** Add structured logging for security-relevant events.

---

### 13. `claim.message` Used in OG Metadata Without Length Check

**File:** `apps/web/src/app/claims/[id]/page.tsx:26`

```ts
openGraph: { title: `Claim: ${claim.message}`, ...}
```

**Risk:** claim.message can be up to 1000 chars. OG title best practice is ~60 chars. Not a security issue but could be used for SEO spam if claims are indexable.

**Fix:** Truncate in OG title (already done for page title on line 24 but not for OG title).

---

### 14. `circuit.json` Read from Disk on Every Verification

**File:** `apps/web/src/lib/proof.server.ts:134-136`

**Risk:** Filesystem read + JSON parse per verification request. Under load, adds latency and I/O pressure.

**Fix:** Cache the parsed circuit in module scope.

---

## NOT VULNERABLE (Verified Safe)

- **SQL Injection**: All DB queries use Drizzle parameterized queries. `sql` template tags properly parameterize values.
- **XSS**: No `dangerouslySetInnerHTML` usage. React auto-escapes. OG images use `next/og` ImageResponse which is text-only rendering.
- **Secrets in repo**: `.env.local` is gitignored. Only `.env.example` with placeholder values committed.
- **DB query limits**: `getClaims` and `getProofsByClaimId` enforce `MAX_QUERY_LIMIT = 100`.

---

## Priority Fix Order

1. **CORS middleware** on Hono (#4) — trivial fix, high impact
2. **Error message sanitization** (#1) — moderate effort, high impact
3. **Security headers** via middleware/config (#5) — trivial fix
4. **Input validation hardening** (#6, #7, #11) — moderate effort
5. **Rate limiting upgrade** to external store (#2, #3) — higher effort but critical for production
6. **CSRF on Hono POST** (#8) — moderate effort
7. **Barretenberg resource management** (#9) — moderate effort
8. **Schema fix** for nullable verifierNullifier (#10) — trivial + migration
9. **Cache circuit.json** (#14) — trivial
10. **Audit logging** (#12) — ongoing effort
