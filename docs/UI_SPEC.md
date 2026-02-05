# UI Specification - Proof of Transfer

## Overview

Proof of Transfer is a web app for creating verifiable on-chain transfer claims using zero-knowledge proofs. Users can create claims about token transfers, and others can generate ZK proofs to verify their transfers without revealing their wallet address.

**Tech Stack:** Next.js 16, React, TailwindCSS, shadcn/ui components

---

## Routes

| Route | Page |
|-------|------|
| `/` | Home - Claims List |
| `/create` | Create Claim |
| `/claims/[id]` | Claim Details |

---

## General Layout

### Header (all pages)

**Left side:**
- Logo text: "PROOF OF TRANSFER" (links to home)

**Right side (actions):**
- "All Claims" button (links to `/`)
- "Create Claim" button (links to `/create`)
- Connect Wallet button
  - When disconnected: shows "Connect Wallet"
  - When connected: shows truncated address `0x1234...5678`
- Theme Switcher (dark/light toggle)

---

## Page: Home (`/`)

### Content

**Title Section:**
- Page title
- Subtitle describing the app purpose

**Claims Grid:**
- Grid layout of claim cards (responsive: 1 column mobile, 2 columns desktop)
- Loading state while fetching
- Error state if fetch fails
- Empty state if no claims exist

### Claim Card

Each card displays:

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Claim ID (truncated format) |
| `createdAt` | timestamp | When claim was created |
| `message` | text | Claim description/purpose |
| `proofCount` | number | Number of proofs submitted |
| `chainId` | enum | Blockchain network |
| `token` | object | Token info (name, symbol) or address if unknown |
| `recipientAddress` | address | Who received transfers |
| `minTransfersSum` | string | Minimum amount constraint (0 = no minimum) |
| `maxTransfersSum` | string | Maximum amount constraint (0 = no maximum) |
| `fromBlockTimestamp` | number | Start time constraint (0 = no start) |
| `toBlockTimestamp` | number | End time constraint (0 = no end) |

**Card Actions:**
- "View Details" button (links to `/claims/[id]`)

**Display Notes:**
- Chain should show human-readable name (Ethereum, Base, Arbitrum, etc.)
- Token should prefer showing "name (symbol)" if available, fallback to address
- Addresses should be truncated: `0x1234...5678`
- Timestamps should be formatted as dates
- Amount constraints: show range like "5 - 100 USDC" or "Min: 5 USDC" or "No constraints"

---

## Page: Create Claim (`/create`)

### Content

**Title Section:**
- Page title
- Description of what creating a claim does

### Create Claim Form

**Section 1: Claim Message**

| Field | Input Type | Validation |
|-------|------------|------------|
| `claimMessage` | textarea | Required, 10-1000 characters |

Description: What is this claim for (e.g., "Birthday gift to Alice", "Raffle donation")

**Section 2: Token Information**

| Field | Input Type | Validation |
|-------|------------|------------|
| `chainId` | select dropdown | Required, default: Base |
| `tokenAddress` | text input | Required, valid EVM address (0x + 40 hex chars) |
| `recipientAddress` | text input | Required, valid EVM address |

**Chain Options:**
- Ethereum (1)
- Optimism (10)
- BNB Chain (56)
- Polygon (137)
- Base (8453)
- Arbitrum (42161)
- Scroll (534352)

**Token Address Behavior:**
- When valid address entered, auto-fetch token info
- Show loading indicator while fetching
- Display token name, symbol, decimals when found
- Show error if invalid token

**Section 3: Amount Constraints (Optional)**

| Field | Input Type | Validation |
|-------|------------|------------|
| `minTransfersSum` | number input | Optional, non-negative, default: 0 |
| `maxTransfersSum` | number input | Optional, non-negative, must be >= min if set |

Description: Leave as 0 for no constraint

**Section 4: Time Range (Optional)**

| Field | Input Type | Validation |
|-------|------------|------------|
| `fromDate` | date picker | Optional, cannot be in future |
| `toDate` | date picker | Optional, must be after fromDate |

**Date Picker Features:**
- Calendar popup for selection
- Clear button to remove date
- Disable future dates option

**Form Actions:**
- "Cancel" button (returns to home)
- "Create Claim" button (submits form)

**Form States:**
- Loading state while submitting
- Success: redirect to home, show toast
- Error: show validation errors inline

---

## Page: Claim Details (`/claims/[id]`)

### Content

**Navigation:**
- "Back to claims" link (not button - use text link to avoid padding issues)

**Claim Details Section:**

Display all claim information:

| Field | Description |
|-------|-------------|
| `id` | Full claim UUID |
| `message` | Full claim message |
| `chainId` | Chain name |
| `tokenAddress` | Token address (with token name/symbol if available) |
| `recipientAddress` | Recipient address |
| `minTransfersSum` | Minimum amount (formatted with token decimals) |
| `maxTransfersSum` | Maximum amount (formatted with token decimals) |
| `fromBlockTimestamp` | Start date (or "No start date") |
| `toBlockTimestamp` | End date (or "No end date") |
| `merkleRoot` | Merkle tree root hash |
| `createdAt` | Creation timestamp |

### Transfers Section

**Displayed automatically** (no user action needed):
- All transfers matching claim constraints loaded on page load
- Transfer count display

**Transfer Card:**

| Field | Description |
|-------|-------------|
| `senderAddress` | From address (highlight if matches connected wallet) |
| `amount` | Transfer amount |
| `blockTimestamp` | Transfer date |
| `txHash` | Transaction hash (link to block explorer) |

**When wallet connected:**
- Filter toggle appears: "All Transfers" / "My Transfers Only"
- User's own transfers highlighted with badge

---

### Proof Generator Section

**Step 1: Connect Wallet**
- If not connected: show "Connect Wallet" prompt
- If connected: show connected address, proceed to step 2

**Step 2: Sign Message**
- "Sign Message" button
- User signs message with wallet
- After signing: display generated **nullifier** (hash)

**Step 3: Generate Proof**
- "Generate ZK Proof" button (only if user has matching transfers and signed message)
- Progress indicator during generation (this takes time)
- Show generated proof data when complete:
  - Nullifier
  - Proof data (collapsible/truncated)
  - Transfers root hash

**Step 4: Submit Proof**
- "Submit Proof" button
- Loading state while submitting
- Success: refresh page, show toast
- Error: show error message

---

### Proofs List Section

**Position:** Must appear AFTER the Proof Generator section

**Title:** "Submitted Proofs" with count

**States:**
- Loading state
- Error state
- Empty state: "No proofs submitted yet"

**Proof Card:**

| Field | Description |
|-------|-------------|
| `id` | Proof UUID |
| `createdAt` | Submission timestamp |
| `nullifier` | Truncated nullifier |
| Verification status | Badge showing verification state |

**Verification Status:**
- Unverified: neutral badge
- Verified (valid): green checkmark, success rate %
- Verified (invalid): red X, error message

**Proof Verification Options:**

User can verify proof using one of two methods:

1. **Fetch Transfers** - "Fetch Transfers" button fetches transfers from Etherscan API
2. **CSV Upload** - File input to upload CSV files downloaded from Etherscan

After transfers loaded (either method):
- "Verify Proof" button becomes available
- Triggers server-side verification

---

## Components Needed

### Layout Components
- `Header` - Navigation bar for all pages
- `PageContainer` - Consistent page wrapper with max-width

### Form Components
- `Input` - Text input with label, error state
- `Textarea` - Multi-line input with label, error state
- `Select` - Dropdown with label
- `DatePicker` - Calendar popup date selection
- `FileInput` - File upload input for CSV files
- `Button` - Primary, secondary, ghost variants

### Display Components
- `Card` - Container for claim/proof cards
- `Badge` - Status indicators (proof count, verification status)
- `Address` - Truncated address display with copy button
- `Hash` - Truncated hash display with copy button
- `Link` - Text link for navigation (use instead of button for back navigation)

### State Components
- `LoadingState` - Spinner with message
- `ErrorState` - Error message display
- `EmptyState` - Empty list with message and optional action

### Feedback Components
- `Toast` - Success/error notifications

---

## Supported Chains

| Chain | ID | Name |
|-------|-----|------|
| Ethereum | 1 | Ethereum |
| Optimism | 10 | Optimism |
| BNB Chain | 56 | BNB Chain |
| Polygon | 137 | Polygon |
| Base | 8453 | Base |
| Arbitrum | 42161 | Arbitrum |
| Scroll | 534352 | Scroll |

---

## Data Types Reference

### ClaimEntity

```typescript
{
  id: string               // UUID
  message: string          // Claim description
  messageHash: string      // Poseidon2 hash of message
  tokenAddress: string     // ERC20 token contract (0x...)
  recipientAddress: string // Transfer recipient (0x...)
  minTransfersSum: string  // Minimum amount as string ("0" = no min)
  maxTransfersSum: string  // Maximum amount as string ("0" = no max)
  fromBlockTimestamp: number // Unix timestamp (0 = no start)
  toBlockTimestamp: number   // Unix timestamp (0 = no end)
  chainId: number          // EVM chain ID
  creatorAddress: string   // Who created the claim
  merkleRoot: string | null // Merkle tree root
  createdAt: Date          // Creation timestamp
  proofCount: number       // Computed: number of proofs
  token: TokenEntity | null // Joined token data
}
```

### ProofEntity

```typescript
{
  id: string              // UUID
  claimId: string         // Reference to claim
  nullifier: string       // Unique proof identifier
  proofData: string       // ZK proof bytes (hex)
  publicInputs: object    // Proof public inputs
  transfersRootHash: string // Merkle root used
  proverAddress: string | null // Who generated proof
  createdAt: Date         // Submission timestamp
}
```

### TokenEntity

```typescript
{
  id: string        // UUID
  address: string   // Token contract address
  chainId: number   // Chain ID
  name: string      // Token name
  symbol: string    // Token symbol
  decimals: number  // Token decimals
}
```

### EtherscanTransfer (from API)

```typescript
{
  hash: string           // Transaction hash
  from: string           // Sender address
  to: string             // Recipient address
  contractAddress: string // Token address
  value: string          // Amount in wei
  timeStamp: string      // Unix timestamp
  blockNumber: string    // Block number
}
```

---

## User Flows Summary

### Flow 1: Create Claim
1. User clicks "Create Claim"
2. Fills form with message, token, recipient, constraints
3. Submits form
4. System fetches matching transfers from Etherscan
5. System builds merkle tree
6. Claim created, user redirected to home

### Flow 2: Generate Proof
1. User views claim details (transfers already displayed)
2. Connects wallet
3. Sees their transfers highlighted in list
4. Signs message → nullifier displayed
5. Generates ZK proof (client-side, takes time)
6. Submits proof
7. Proof appears in list below

### Flow 3: Verify Proof
1. User sees proof in list
2. Loads transfers via:
   - Option A: "Fetch Transfers" button (Etherscan API)
   - Option B: Upload CSV file from Etherscan
3. Clicks "Verify Proof"
4. Server verifies proof
5. Result shown (valid/invalid badge)
