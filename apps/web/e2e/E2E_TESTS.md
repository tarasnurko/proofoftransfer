# E2E Test Flows

> **Keep this file in sync with all E2E tests.**
> When adding/removing tests, update this file.
>
> - `##` — test suite (spec file or `test.describe`)
> - `-` — individual test (`test()`)
> - `1. 2. 3.` — steps inside a single test (`test.step()`)
> - `check:` — what the test asserts (one per assertion)
>
> **Debug a single test interactively:**
> ```bash
> PWDEBUG=1 pnpm exec playwright test <file>.spec.ts -g "<test name>" --headed --project=static
> ```
> Pauses before each action. Click "Step over" to advance, or interact with the browser freely.

## Static — Home Page (`home.spec.ts`)

- Displays 10 claims on page 1 with pagination info
  - check: heading "Transfer Claims"
  - check: text "Showing 1 to 10 of 15 claims"
  - check: 10 "view details" links
- Navigates between pages via pagination buttons
  - check: page 2 shows "Showing 11 to 15 of 15 claims"
  - check: 5 "view details" links on page 2
  - check: clicking page "1" returns to "Showing 1 to 10 of 15 claims"
- Filters claims by message text search
  - check: typing "reward" shows 3 claims
  - check: "DAO contributor received at least 3 weekly reward transfers" visible
  - check: "Prove I received liquidity rewards during Q1 2025" visible
  - check: "Staking reward distribution…" visible
  - check: typing "salary" shows 1 claim
  - check: "Monthly salary payment proof for remote contractor Jan–Mar 2025" visible
- Filters claims by token address search
  - check: pasting TST token address shows 6 claims (only TST-based Ethereum claims)
- Filters by shared counterparty address shows multiple
  - check: pasting shared counterparty address (gooddao.eth) shows 12 claims
- Filters by unique counterparty address shows one
  - check: pasting unique counterparty address (devguild.eth) shows "Showing 1 to 1 of 1 claims"
  - check: "open-source grant payment" text visible
- Shows empty state when search has no matches
  - check: text "No Matches Found"
  - check: text "Try adjusting your search or filters"
- Filters claims by chain dropdown
  - check: selecting "Ethereum" → 8 claims
  - check: switching to "Base" → 7 claims
- Combines chain filter with text search
  - check: Ethereum chain + search "donated 100 TST" → "Showing 1 to 1 of 1 claims"
  - check: "Prove I donated 100 TST to the public goods fund" visible
- Sorts by newest first (default)
  - check: "Base ecosystem early adopter…" visible on page 1 (last seeded claim)
- Sorts by oldest first
  - check: "Prove I donated 100 TST to the public goods fund" visible on page 1 (first seeded claim)
- Sorts by most proofs
  - check: first card has "3 Proofs" badge
- Sorts by least proofs
  - check: first card has "0 Proofs" badge
- Navigates to claim details page
  - check: URL matches `/claims/`
  - check: heading "Claim Details"
- Navigates to create claim page
  - check: URL is `/create`
  - check: heading "Create Claim"

## Static — Claim Details (`claim-details.spec.ts`)

- Displays claim info
  - check: heading "Claim Details"
  - check: claim message text visible
  - check: token name "Test Token" visible
  - check: chain badge "Ethereum"
  - check: truncated recipient address visible
- Shows correct proof count badge
  - check: text "3 Proofs"
- Shows transfers section
  - check: text "Transfers"
  - check: text matching "transfer.\*matching this claim"
- Shows submitted proofs section
  - check: text "Submitted Proofs"
  - check: text matching "3 proofs? submitted"
- Back link navigates home
  - check: URL becomes `/`
- 404 for invalid claim
  - check: heading "not found"
- Shows generate proof section with wallet prompt
  - check: text "Generate Proof"
  - check: text matching "connect.\*wallet"
- Singular proof label
  - check: text "1 Proof" (exact)
- Empty state for 0 proofs
  - check: no "N Proof" badge visible
  - check: heading "No Proofs"

## Static — Proof Details (`proof-details.spec.ts`)

- Displays proof info
  - check: heading "Proof Details"
  - check: text "Proof Information"
  - check: truncated nullifier (first 10 chars) visible
- Shows claim information section
  - check: text "Claim Information"
  - check: claim message text visible
- Shows verification stats
  - check: text "Verify Proof"
- Expands proof data
  - check: clicking "show proof data" reveals `<pre>` element
- Back link to claim
  - check: URL becomes `/claims/{claimId}`
- 404 for invalid proof
  - check: heading "not found"
- Shows wallet connect prompt
  - check: text matching "connect.\*wallet"

## Static — Create Claim (`create-claim.spec.ts`)

- Renders form
  - check: heading "Create Claim"
  - check: card "Claim Details"
  - check: card "Token Information"
  - check: card "Constraints"
  - check: card "Time Range"
  - check: button "Cancel"
  - check: button "Fetch Transfers"
- Validation errors on empty submit
  - check: toast "Please fill the form correctly"
- Message input works
  - check: typing "My test claim for E2E" shows "21.\*characters"
- Back link navigates home
  - check: URL becomes `/`
- Cancel button navigates home
  - check: URL becomes `/`

## Wallet — Connect (`wallet-flow.spec.ts`)

- Connects MetaMask wallet
  - check: click "connect" button
  - check: click "MetaMask" option
  - check: approve in MetaMask
  - check: truncated address `0x....` visible

## Wallet — Full Flow (`flows.spec.ts`)

- Create claim → generate proof → verify → self-verify rejection
  1. Create claim with real transfers
     - check: fill message field
     - check: fill token address → "Test Token (TST)" appears
     - check: fill recipient address
     - check: click "Fetch Transfers" → "Transfers Preview" visible
     - check: click "Create Claim" → redirected to `/`
     - check: search finds claim → "Showing 1 to 1 of 1 claims"
     - check: navigate to claim details page
  2. Generate ZK proof
     - check: switch to Sender account
     - check: connect wallet → "Connected:" visible
     - check: "Sign Claim" button visible
     - check: click "Sign Claim" → sign in MetaMask → "Claim Signed"
     - check: click "Generate Proof" → "Proof generated and submitted!"
     - check: proof link appears and navigates to proof page
  3. Verify proof from different account
     - check: switch to Account 1
     - check: connect wallet if needed
     - check: click "Fetch Transfers" → "transfers fetched"
     - check: click "Sign & Verify Proof" → sign → "Proof verified successfully!"
  4. Self-verification rejection
     - check: switch to Sender (prover)
     - check: connect wallet if needed
     - check: fetch transfers
     - check: click "Sign & Verify Proof" → sign → "Cannot verify your own proof"
